import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Trash2,
  Clock,
  Flame,
  Shield,
  MessageSquare,
  Crown,
  Sparkles,
  Info,
  Loader2,
} from 'lucide-react';
import { Lobby, LobbyMessage } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  sendLobbyChatMessage,
  subscribeLobbyMessages,
  purgeAllLobbyMessages,
  cleanupExpiredLobbyMessages,
  getLobbyChatExpiryLabel,
} from '../../lib/lobbyChatService';

interface LobbyChatModalProps {
  isOpen: boolean;
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
  isOpen,
  lobby,
  onClose,
}) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState<LobbyMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const [purging, setPurging] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isHost = lobby?.hostId === user?.uid;
  const expiryInfo = getLobbyChatExpiryLabel(lobby);

  // Subscribe to real-time messages & run quiet cleanup on open
  useEffect(() => {
    if (!isOpen || !lobby?.id) {
      setMessages([]);
      return;
    }

    // Free background cleanup of expired messages
    cleanupExpiredLobbyMessages(lobby.id).catch(() => {});

    const unsubscribe = subscribeLobbyMessages(lobby.id, (msgs) => {
      setMessages(msgs);
    });

    return () => unsubscribe();
  }, [isOpen, lobby?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen || !lobby) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputText).trim();
    if (!text || !user) return;

    setSending(true);
    try {
      await sendLobbyChatMessage({
        lobbyId: lobby.id,
        senderId: user.uid,
        senderName: profile?.displayName || user.displayName || 'Athlete',
        senderPhotoURL: profile?.photoURL || user.photoURL || null,
        text,
        isHost,
        lobby,
      });
      setInputText('');
    } catch (err: any) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handlePurgeChat = async () => {
    if (!confirm('Purge all chat messages immediately? This cannot be undone.')) {
      return;
    }

    setPurging(true);
    try {
      await purgeAllLobbyMessages(lobby.id);
    } catch (err) {
      console.error('Failed to purge chat messages:', err);
    } finally {
      setPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col h-[640px] max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[260px]">
                  {lobby.name}
                </h3>
                <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30 flex items-center gap-0.5 flex-shrink-0">
                  <Flame className="w-2.5 h-2.5 text-amber-400" />
                  Ephemeral
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                {lobby.sport} • {lobby.currentPlayers || 1}/{lobby.maxPlayers || 10} Athletes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {isHost && (
              <button
                type="button"
                onClick={handlePurgeChat}
                disabled={purging || messages.length === 0}
                title="Purge chat history"
                className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-30"
              >
                {purging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ephemeral Countdown Notification Banner */}
        <div className="bg-sky-950/40 border-b border-sky-500/20 px-3.5 py-2 flex items-center justify-between text-xs text-sky-200 flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />
            <span className="text-[11px] font-medium">{expiryInfo.timeRemainingLabel}</span>
          </div>
          <span className="text-[10px] text-sky-300/70 hidden sm:inline">
            Self-destructs 2h after match
          </span>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/60 flex items-center justify-center text-slate-400 mb-3">
                <Sparkles className="w-6 h-6 text-indigo-400" />
              </div>
              <h4 className="text-sm font-bold text-slate-300 mb-1">Squad Match Chat</h4>
              <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
                Coordinate match strategy, jersey colors, and arrival times. Messages automatically clear post-match.
              </p>
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === user?.uid;
              const isSenderHost = m.isHost || m.senderId === lobby.hostId;
              const formattedTime = m.createdAt
                ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                : '';

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                >
                  {!isMe && (
                    <div className="flex items-center gap-1 mb-1 px-1">
                      <span className="text-[11px] font-bold text-slate-400">
                        {m.senderName}
                      </span>
                      {isSenderHost && (
                        <span className="text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1 rounded flex items-center gap-0.5">
                          <Crown className="w-2.5 h-2.5" />
                          Host
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-xs ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-slate-800 border border-slate-700 text-slate-200 rounded-bl-xs'
                    }`}
                  >
                    <p className="leading-relaxed whitespace-pre-wrap break-words">{m.text}</p>
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isMe ? 'text-indigo-200' : 'text-slate-400'
                      }`}
                    >
                      {formattedTime}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Presets Bar */}
        <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto flex-shrink-0 scrollbar-none">
          {QUICK_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(preset)}
              className="text-[11px] bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors flex-shrink-0 cursor-pointer"
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3 bg-slate-900 border-t border-slate-800 flex items-center gap-2 flex-shrink-0"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type message to squad..."
            maxLength={300}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors disabled:opacity-40 cursor-pointer flex-shrink-0"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </form>
      </div>
    </div>
  );
};
