import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  MessageSquare,
  ShieldAlert,
  Loader2,
  Lock,
  User,
  Sparkles,
  CheckCheck,
  Paperclip,
  FileText,
  Video,
  Trash2,
  AlertTriangle,
  Download,
  Maximize2,
  RefreshCw,
  Clock,
} from 'lucide-react';
import { DirectMessage, DirectConversation, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  getOrCreateDirectConversation,
  sendDirectMessage,
  subscribeDirectMessages,
  markConversationAsRead,
  joinActiveChat,
  leaveActiveChat,
  verifyMessagingAllowance,
  acceptMessageRequest,
  deleteMessageRequest,
  blockMessageRequest,
  isConversationExpired,
  deleteDirectConversation,
} from '../../lib/directMessagingService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

interface DirectMessageModalProps {
  isOpen: boolean;
  targetPlayer: {
    uid: string;
    displayName: string;
    photoURL?: string | null;
    role?: string;
    username?: string;
    privacySettings?: { allowDirectMessages?: boolean };
  } | null;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

const PRESET_ICEBREAKERS = [
  '👋 Hey! Down for a match?',
  '⚽ Looking for a teammate?',
  '📍 Which turf do you play at?',
  '🔥 Great game earlier!',
];

export const DirectMessageModal: React.FC<DirectMessageModalProps> = ({
  isOpen,
  targetPlayer,
  onClose,
  showToast,
}) => {
  const { user, profile } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<DirectConversation | null>(null);
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<DirectMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [retryTrigger, setRetryTrigger] = useState(0);
  const [messagingAllowance, setMessagingAllowance] = useState<{ allowed: boolean; reason?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Optional Media Messaging States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadedMediaUrl, setUploadedMediaUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Lightbox Modal States
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);

  // Revoke object URL on change
  useEffect(() => {
    return () => {
      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
      }
    };
  }, [filePreviewUrl]);

  // Cancel any active upload and clear files state
  const clearFileState = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      uploadTaskRef.current = null;
    }
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setUploadedMediaUrl(null);
    setUploadProgress(null);
    setUploading(false);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Reset file selection when active chat details or modal open state change
  useEffect(() => {
    clearFileState();
  }, [conversationId, isOpen]);

  // Client-side file-type/size validations
  const validateFile = (file: File) => {
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
    const allowedPdfTypes = ['application/pdf'];
    const maxSizeImage = 10 * 1024 * 1024; // 10MB
    const maxSizeVideo = 20 * 1024 * 1024; // 20MB
    const maxSizePdf = 10 * 1024 * 1024; // 10MB

    if (allowedImageTypes.includes(file.type)) {
      if (file.size > maxSizeImage) {
        return { valid: false, reason: 'Image file size must be less than 10MB.' };
      }
      return { valid: true };
    }
    if (allowedVideoTypes.includes(file.type)) {
      if (file.size > maxSizeVideo) {
        return { valid: false, reason: 'Video file size must be less than 20MB.' };
      }
      return { valid: true };
    }
    if (allowedPdfTypes.includes(file.type)) {
      if (file.size > maxSizePdf) {
        return { valid: false, reason: 'PDF file size must be less than 10MB.' };
      }
      return { valid: true };
    }

    return { valid: false, reason: 'Unsupported file format. Supported: PNG, JPG, WEBP, GIF, MP4, WEBM, PDF.' };
  };

  // Resumable upload routine with progress notification
  const startUpload = (file: File) => {
    if (!conversationId || !user) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setUploadError(validation.reason || 'Invalid file');
      showToast?.(validation.reason || 'Invalid file', 'error');
      return;
    }

    setUploadError(null);
    setSelectedFile(file);
    setUploading(true);
    setUploadProgress(0);

    const previewUrl = URL.createObjectURL(file);
    setFilePreviewUrl(previewUrl);

    // Secure, private file path structure
    const uniqueFileName = `${Date.now()}_${file.name}`;
    const storagePath = `conversations/${conversationId}/${uniqueFileName}`;
    const storageRef = ref(storage, storagePath);

    const uploadTask = uploadBytesResumable(storageRef, file);
    uploadTaskRef.current = uploadTask;

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setUploadProgress(progress);
      },
      (error) => {
        console.error('Firebase Storage upload error:', error);
        setUploadError(`Upload failed: ${error.message}`);
        setUploading(false);
        setUploadProgress(null);
      },
      async () => {
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          setUploadedMediaUrl(downloadUrl);
          setUploading(false);
          setUploadProgress(null);
        } catch (err: any) {
          console.error('Error getting download URL:', err);
          setUploadError(`Failed to get URL: ${err.message}`);
          setUploading(false);
        }
      }
    );
  };

  const handleRetryUpload = () => {
    if (selectedFile) {
      startUpload(selectedFile);
    }
  };

  // Subscribe to conversation document metadata in real-time
  useEffect(() => {
    if (!conversationId || !isOpen) {
      setConversation(null);
      return;
    }
    const convRef = doc(db, 'direct_conversations', conversationId);
    const unsubscribe = onSnapshot(convRef, (snap) => {
      if (snap.exists()) {
        const convData = snap.data() as DirectConversation;
        if (isConversationExpired(convData)) {
          console.log(`[Direct Messaging] Conversation ${conversationId} is older than 24 hours. Purging.`);
          deleteDirectConversation(conversationId).catch((e) => console.warn('Purge error:', e));
          setConversation(null);
          setMessages([]);
        } else {
          setConversation(convData);
        }
      }
    }, (err) => {
      console.warn('Error subscribing to conversation metadata:', err);
    });
    return () => unsubscribe();
  }, [conversationId, isOpen]);

  const isDMsDisabled =
    targetPlayer?.privacySettings?.allowDirectMessages === false ||
    (messagingAllowance !== null && !messagingAllowance.allowed);

  // Clear optimistic messages on conversation change
  useEffect(() => {
    setOptimisticMessages([]);
  }, [conversationId]);

  // Compute merged messages avoiding duplicates
  const mergedMessages = React.useMemo(() => {
    const dbIds = new Set(messages.map((m) => m.id));
    const pending = optimisticMessages.filter((m) => !dbIds.has(m.id));
    return [...messages, ...pending].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, [messages, optimisticMessages]);

  // Initialize or fetch conversation
  useEffect(() => {
    if (!isOpen || !targetPlayer || !user) {
      setConversationId(null);
      setMessages([]);
      setInitializing(false);
      setInitError(null);
      setMessagingAllowance(null);
      return;
    }

    let isMounted = true;
    setInitializing(true);
    setInitError(null);

    // Enforce messaging privacy & safety check first
    verifyMessagingAllowance(user.uid, targetPlayer.uid)
      .then((allowance) => {
        if (!isMounted) return;
        setMessagingAllowance(allowance);

        if (!allowance.allowed) {
          setInitializing(false);
          return;
        }

        return getOrCreateDirectConversation(
          {
            uid: user.uid,
            displayName: profile?.displayName || user.displayName || 'Athlete',
            photoURL: profile?.photoURL || user.photoURL || '',
            role: profile?.role || 'PLAYER',
            username: profile?.username || '',
          },
          {
            uid: targetPlayer.uid,
            displayName: targetPlayer.displayName,
            photoURL: targetPlayer.photoURL || '',
            role: targetPlayer.role || 'PLAYER',
            username: targetPlayer.username || '',
          }
        );
      })
      .then((conv) => {
        if (!isMounted || !conv) return;
        setConversationId(conv.id);
        markConversationAsRead(conv.id, user.uid);
      })
      .catch((err: any) => {
        console.error('Failed to check/create conversation:', err);
        if (isMounted) {
          setInitError(err?.message || 'Failed to establish conversation channel.');
        }
      })
      .finally(() => {
        if (isMounted) setInitializing(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetPlayer?.uid, user?.uid, retryTrigger]);

  // Subscribe to real-time messages when conversationId is active
  useEffect(() => {
    if (!conversationId || !isOpen) return;

    if (user?.uid) {
      joinActiveChat(conversationId, user.uid);
    }

    const unsubscribe = subscribeDirectMessages(conversationId, (msgs) => {
      setMessages(msgs);
      if (user?.uid) {
        markConversationAsRead(conversationId, user.uid);
      }
    });

    return () => {
      unsubscribe();
      if (user?.uid) {
        leaveActiveChat(conversationId, user.uid);
      }
    };
  }, [conversationId, isOpen, user?.uid]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mergedMessages]);

  if (!isOpen || !targetPlayer) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if ((!text && !uploadedMediaUrl) || !user || !conversationId) return;

    if (uploading) {
      showToast?.('Please wait for the media file upload to complete.', 'error');
      return;
    }
    if (uploadError) {
      showToast?.('Please fix upload errors or remove the attachment before sending.', 'error');
      return;
    }

    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const optimisticMsg: DirectMessage = {
      id: tempId,
      conversationId,
      senderId: user.uid,
      senderName: profile?.displayName || user.displayName || 'Athlete',
      senderPhotoURL: profile?.photoURL || user.photoURL || null,
      text,
      createdAt: new Date().toISOString(),
      read: false,
      status: 'sending',
      mediaUrl: uploadedMediaUrl || null,
      mediaType: selectedFile?.type || null,
      mediaName: selectedFile?.name || null,
      mediaSize: selectedFile?.size || null,
    };

    setOptimisticMessages((prev) => [...prev, optimisticMsg]);
    setInputText('');

    const mediaToSend = uploadedMediaUrl;
    const typeToSend = selectedFile?.type;
    const nameToSend = selectedFile?.name;
    const sizeToSend = selectedFile?.size;
    clearFileState();

    setSending(true);

    try {
      await sendDirectMessage({
        conversationId,
        senderId: user.uid,
        recipientId: targetPlayer.uid,
        senderName: profile?.displayName || user.displayName || 'Athlete',
        senderPhotoURL: profile?.photoURL || user.photoURL || null,
        text,
        messageId: tempId,
        mediaUrl: mediaToSend,
        mediaType: typeToSend,
        mediaName: nameToSend,
        mediaSize: sizeToSend,
      });
      // Update local optimistic status to sent
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'sent' } : m))
      );
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setOptimisticMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: 'error' } : m))
      );
      showToast?.(err.message || 'Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full h-[85vh] max-h-[680px] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                {targetPlayer.photoURL ? (
                  <img
                    src={targetPlayer.photoURL}
                    alt={targetPlayer.displayName}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User className="w-5 h-5 text-emerald-400" />
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate">{targetPlayer.displayName}</h3>
                {targetPlayer.role === 'OWNER' && (
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-950/80 border border-amber-500/30 px-1.5 py-0.2 rounded">
                    Owner
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-400 truncate">
                  {targetPlayer.username ? `@${targetPlayer.username}` : 'Direct Athlete Chat'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded">
                  <Clock className="w-2.5 h-2.5" />
                  Disappears in 24h
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Ephemeral 24-Hour Notice Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 flex items-center justify-between text-xs text-amber-300 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="truncate">This chat automatically disappears after 24 hours.</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full shrink-0 ml-2">
            Auto-Deletes in 24h
          </span>
        </div>

        {/* Message Feed / Main Body */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar bg-slate-950/40">
          {initializing ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span className="text-xs">Connecting secure chat channel...</span>
            </div>
          ) : initError ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Unable to Start Conversation</h4>
              <p className="text-xs text-rose-300/80 max-w-xs">
                {initError}
              </p>
              <button
                type="button"
                onClick={() => setRetryTrigger((prev) => prev + 1)}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          ) : isDMsDisabled ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">Direct Messages Restricted</h4>
              <p className="text-xs text-slate-400 max-w-xs">
                {messagingAllowance?.reason || `${targetPlayer.displayName} has turned off direct messages in their privacy settings.`}
              </p>
            </div>
          ) : mergedMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3 text-slate-400">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-200">Start the conversation</h4>
                <p className="text-xs text-slate-400 max-w-xs mt-1">
                  Send a friendly message to coordinate matches, teams, or training sessions with {targetPlayer.displayName}.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-[11px] font-medium text-amber-300 mt-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Chats & messages automatically disappear after 24 hours</span>
                </div>
              </div>

              {/* Icebreaker preset prompts only before chatting starts and if not typing */}
              {!inputText.trim() && (
                <div className="pt-2 flex flex-wrap justify-center gap-1.5 max-w-xs">
                  {PRESET_ICEBREAKERS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSendMessage(preset)}
                      className="text-[11px] font-medium bg-slate-900 hover:bg-slate-800 text-emerald-300 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm text-left"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Ephemeral 24-Hour Notice inside Message Stream */}
              <div className="py-1 flex items-center justify-center">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-amber-500/20 text-[10px] font-medium text-amber-300/80 shadow-sm">
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Messages in this conversation automatically disappear after 24 hours</span>
                </div>
              </div>

              {mergedMessages.map((msg) => {
              const isMine = msg.senderId === user?.uid;
              const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={msg.id}
                  className={`flex items-end gap-2 ${isMine ? 'justify-end' : 'justify-start'}`}
                >
                  {!isMine && (
                    <div className="w-7 h-7 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 shrink-0 mb-1 flex items-center justify-center text-xs font-bold text-emerald-400">
                      {msg.senderPhotoURL ? (
                        <img src={msg.senderPhotoURL} alt={msg.senderName} className="w-full h-full object-cover" />
                      ) : (
                        msg.senderName.charAt(0)
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[78%] rounded-2xl p-2.5 text-xs font-medium space-y-2 shadow-md ${
                      isMine
                        ? 'bg-emerald-600 text-white rounded-br-none'
                        : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-bl-none'
                    }`}
                  >
                    {/* Media Display */}
                    {msg.mediaUrl && (
                      <div className="rounded-xl overflow-hidden bg-slate-950/40">
                        {msg.mediaType?.startsWith('image/') ? (
                          <div 
                            className="relative group cursor-pointer overflow-hidden max-h-[220px]"
                            onClick={() => {
                              setLightboxImageUrl(msg.mediaUrl || null);
                              setIsLightboxOpen(true);
                            }}
                          >
                            <img
                              src={msg.mediaUrl}
                              alt={msg.mediaName || 'Image'}
                              className="w-full h-full object-cover rounded-xl transition-transform duration-200 hover:scale-105"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="w-5 h-5 text-white" />
                            </div>
                          </div>
                        ) : msg.mediaType?.startsWith('video/') ? (
                          <video
                            src={msg.mediaUrl}
                            controls
                            className="w-full max-h-[220px] rounded-xl outline-none"
                          />
                        ) : (
                          // Document/PDF view
                          <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl gap-3 border border-slate-800/40">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5" />
                              </div>
                              <div className="min-w-0 text-left">
                                <p className="font-bold text-slate-200 truncate text-[11px] max-w-[140px] md:max-w-[200px]">
                                  {msg.mediaName || 'Document'}
                                </p>
                                <p className="text-[9px] text-slate-400">
                                  {msg.mediaSize ? `${(msg.mediaSize / (1024 * 1024)).toFixed(2)} MB` : 'PDF Document'}
                                </p>
                              </div>
                            </div>
                            <a
                              href={msg.mediaUrl}
                              download={msg.mediaName || 'document'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 flex items-center justify-center transition-all shrink-0 cursor-pointer"
                            >
                              <Download className="w-4 h-4" />
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Text Message */}
                    {msg.text && (
                      <p className="whitespace-pre-wrap break-words leading-relaxed px-1">{msg.text}</p>
                    )}

                    <div
                      className={`flex items-center justify-end gap-1 text-[9px] px-1 ${
                        isMine ? 'text-emerald-200/80' : 'text-slate-400'
                      }`}
                    >
                      <span>{formattedTime}</span>
                      {isMine && (
                        <div className="flex items-center ml-1">
                          {msg.status === 'sending' ? (
                            <Loader2 className="w-3 h-3 animate-spin text-emerald-300/60" />
                          ) : msg.status === 'error' ? (
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-400 animate-pulse" title="Failed to send message." />
                          ) : msg.read ? (
                            <CheckCheck className="w-3.5 h-3.5 text-sky-300 font-bold" title="Read" />
                          ) : (
                            <CheckCheck className="w-3.5 h-3.5 text-emerald-300/40" title="Sent & Delivered" />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* If the current user is the recipient of a pending request */}
        {conversation?.status === 'pending' && conversation?.requestRecipientId === user?.uid ? (
          <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 space-y-3 text-center">
            <p className="text-xs text-slate-300 font-medium">
              Accept message request from <span className="text-emerald-400 font-bold">{targetPlayer.displayName}</span> to start chatting?
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={async () => {
                  if (!conversationId) return;
                  try {
                    await acceptMessageRequest(conversationId);
                    showToast?.('Request accepted!', 'success');
                  } catch (err) {
                    showToast?.('Failed to accept request.', 'error');
                  }
                }}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!conversationId) return;
                  try {
                    await deleteMessageRequest(conversationId);
                    showToast?.('Message request deleted.', 'success');
                    onClose();
                  } catch (err) {
                    showToast?.('Failed to delete request.', 'error');
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Delete
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!conversationId || !user?.uid) return;
                  try {
                    await blockMessageRequest(conversationId, user.uid, targetPlayer.uid);
                    showToast?.('User blocked and request deleted.', 'success');
                    onClose();
                  } catch (err) {
                    showToast?.('Failed to block user.', 'error');
                  }
                }}
                className="bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-800/40 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
              >
                Block User
              </button>
            </div>
          </div>
        ) : conversation?.status === 'pending' && conversation?.requestSenderId === user?.uid ? (
          /* If current user is the sender of a pending request */
          <div className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 text-center">
            <p className="text-xs text-amber-400 font-semibold flex items-center justify-center gap-1.5">
              <span>⌛ Sent as Message Request.</span>
            </p>
            <p className="text-[10px] text-slate-400 mt-1 max-w-xs mx-auto">
              Waiting for {targetPlayer.displayName} to accept your request.
            </p>
          </div>
        ) : (
          /* Normal Message Input - Recommended text bar removed once chatting begins */
          <>
            {/* Selected File / Attachment Preview Area */}
            {selectedFile && (
              <div className="px-4 py-3 bg-slate-950/90 border-t border-slate-800/80 flex items-center justify-between shrink-0 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Thumbnail / Icon Preview */}
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0 relative">
                    {selectedFile.type.startsWith('image/') && filePreviewUrl ? (
                      <img
                        src={filePreviewUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : selectedFile.type.startsWith('video/') ? (
                      <Video className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <FileText className="w-5 h-5 text-emerald-400" />
                    )}

                    {/* Upload progress indicator Overlay */}
                    {uploading && uploadProgress !== null && (
                      <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                        <span className="text-[8px] font-bold text-emerald-300">{uploadProgress}%</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 text-left">
                    <p className="text-xs font-bold text-slate-200 truncate max-w-[180px] sm:max-w-[280px]">
                      {selectedFile.name}
                    </p>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <span>{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                      {uploading ? (
                        <span className="text-emerald-400">Uploading...</span>
                      ) : uploadError ? (
                        <span className="text-rose-400 font-medium flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Upload failed
                        </span>
                      ) : (
                        <span className="text-emerald-500 font-semibold">Ready to send</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Remove or Retry Action Buttons */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {uploadError && (
                    <button
                      type="button"
                      onClick={handleRetryUpload}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                      title="Retry upload"
                    >
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={clearFileState}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                    title="Remove attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Bar */}
            {!isDMsDisabled && (
              <div className="p-3 bg-slate-950 border-t border-slate-800 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) startUpload(file);
                    }}
                    className="hidden"
                    accept="image/*,video/*,application/pdf"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading || sending || initializing}
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                    title="Add image, video, or PDF"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={
                      uploading
                        ? 'Uploading attachment...'
                        : `Message ${targetPlayer.displayName}...`
                    }
                    className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
                    disabled={sending || initializing}
                  />
                  <button
                    type="submit"
                    disabled={(!inputText.trim() && !uploadedMediaUrl) || uploading || sending || initializing}
                    className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold p-2.5 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0 shadow-md shadow-emerald-950/40"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </form>
              </div>
            )}
          </>
        )}
      </div>

      {/* Image Lightbox Modal */}
      {isLightboxOpen && lightboxImageUrl && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-800/60 transition-colors cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="relative max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl flex items-center justify-center">
            <img
              src={lightboxImageUrl}
              alt="Expanded preview"
              className="max-w-full max-h-[80vh] object-contain rounded-xl select-none"
              referrerPolicy="no-referrer"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
};
