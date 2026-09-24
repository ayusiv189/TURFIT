import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Loader2 } from 'lucide-react';
import { GroupMessage, subscribeToGroupChat, sendMessage } from '../../lib/groupChatService';
import { useAuth } from '../../context/AuthContext';

interface GroupChatModalProps {
  isOpen: boolean;
  groupId: string;
  groupName: string;
  groupType: 'team' | 'lobby' | 'tournament' | 'match';
  onClose: () => void;
}

export const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  groupId,
  groupName,
  groupType,
  onClose,
}) => {
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !groupId) return;
    const unsubscribe = subscribeToGroupChat(groupId, groupType, setMessages);
    return () => unsubscribe();
  }, [isOpen, groupId, groupType]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!text.trim() || !user) return;
    setIsLoading(true);
    try {
      await sendMessage(groupId, groupType, {
        senderId: user.uid,
        senderName: user.displayName || 'Anonymous',
        text: text.trim(),
        type: 'text',
      });
      setText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg h-[600px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">{groupName} Chat</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.senderId === user?.uid ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-3 rounded-2xl max-w-[80%] ${m.senderId === user?.uid ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-200'}`}>
                <p className="text-xs font-bold mb-0.5">{m.senderName}</p>
                <p className="text-sm">{m.text}</p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Type a message..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
          />
          <button onClick={handleSend} disabled={isLoading || !text.trim()} className="bg-indigo-600 p-2 rounded-xl text-white disabled:opacity-50">
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};
