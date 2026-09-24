import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  User,
  Search,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  CheckCheck,
  Circle,
} from 'lucide-react';
import { DirectConversation, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import {
  subscribeUserConversations,
  markConversationAsRead,
  isConversationExpired,
} from '../../lib/directMessagingService';
import { DirectMessageModal } from './DirectMessageModal';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface DirectMessagesInboxModalProps {
  isOpen: boolean;
  onClose: () => void;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  initialTargetUserId?: string;
}

// In-memory cache for user profiles to prevent duplicate Firestore reads across re-renders
const userProfileCache = new Map<string, UserProfile>();

export function formatRelativeTime(isoString?: string): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function getActivityStatus(isoString?: string): { isOnline: boolean; label: string } {
  if (!isoString) return { isOnline: false, label: 'Offline' };
  const date = new Date(isoString);
  const now = new Date();
  const diffMin = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffMin <= 5) return { isOnline: true, label: 'Online now' };
  if (diffMin <= 60) return { isOnline: false, label: `Active ${diffMin}m ago` };
  if (diffMin <= 1440) return { isOnline: false, label: `Active ${Math.floor(diffMin / 60)}h ago` };
  return { isOnline: false, label: 'Active recently' };
}

export const DirectMessagesInboxModal: React.FC<DirectMessagesInboxModalProps> = ({
  isOpen,
  onClose,
  showToast,
  initialTargetUserId,
}) => {
  const { user, profile: currentUserProfile } = useAuth();
  const [activeTab, setActiveTab] = useState<'INBOX' | 'REQUESTS'>('INBOX');
  const [conversations, setConversations] = useState<DirectConversation[]>([]);
  const [cachedProfiles, setCachedProfiles] = useState<Record<string, UserProfile>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'ALL' | 'UNREAD'>('ALL');
  const [activeTargetPlayer, setActiveTargetPlayer] = useState<{
    uid: string;
    displayName: string;
    photoURL?: string | null;
    role?: string;
    username?: string;
  } | null>(null);

  // Auto-open specific chat when initialTargetUserId is passed (e.g. clicked notification)
  useEffect(() => {
    if (isOpen && initialTargetUserId) {
      const cached = userProfileCache.get(initialTargetUserId);
      if (cached) {
        setActiveTargetPlayer({
          uid: cached.uid,
          displayName: cached.displayName || 'Athlete',
          photoURL: cached.photoURL || null,
          role: cached.role,
          username: cached.username,
        });
      } else {
        getDoc(doc(db, 'users', initialTargetUserId)).then((userSnap) => {
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            userProfileCache.set(initialTargetUserId, data);
            setCachedProfiles((prev) => ({ ...prev, [initialTargetUserId]: data }));
            setActiveTargetPlayer({
              uid: data.uid,
              displayName: data.displayName || 'Athlete',
              photoURL: data.photoURL || null,
              role: data.role,
              username: data.username,
            });
          }
        });
      }
    }
  }, [isOpen, initialTargetUserId]);

  // 1. Efficient Firestore Real-time Subscription for User Conversations
  useEffect(() => {
    if (!isOpen || !user?.uid) {
      setConversations([]);
      return;
    }

    const unsubscribe = subscribeUserConversations(user.uid, (convs) => {
      setConversations(convs);

      // Extract unique target participant UIDs that aren't cached yet
      const missingUids = new Set<string>();
      convs.forEach((c) => {
        const otherUid = c.participants.find((p) => p !== user.uid);
        if (otherUid && !userProfileCache.has(otherUid)) {
          missingUids.add(otherUid);
        }
      });

      // 2. Fetch missing UserProfiles asynchronously without duplicating queries
      if (missingUids.size > 0) {
        missingUids.forEach(async (targetUid) => {
          try {
            const userSnap = await getDoc(doc(db, 'users', targetUid));
            if (userSnap.exists()) {
              const loadedProfile = userSnap.data() as UserProfile;
              userProfileCache.set(targetUid, loadedProfile);
              setCachedProfiles((prev) => ({ ...prev, [targetUid]: loadedProfile }));
            }
          } catch (err) {
            console.warn('Error fetching participant profile:', err);
          }
        });
      }
    });

    return () => unsubscribe();
  }, [isOpen, user?.uid]);

  // Compute total unread count across all inbox (active) conversations
  const inboxUnreadCount = useMemo(() => {
    if (!user?.uid) return 0;
    const inboxConvs = conversations.filter(
      (c) => c.status !== 'pending' || c.requestSenderId === user.uid
    );
    return inboxConvs.reduce((acc, conv) => acc + (conv.unreadCount?.[user.uid] || 0), 0);
  }, [conversations, user?.uid]);

  // Compute total pending requests count
  const requestsCount = useMemo(() => {
    if (!user?.uid) return 0;
    return conversations.filter(
      (c) => c.status === 'pending' && c.requestRecipientId === user.uid
    ).length;
  }, [conversations, user?.uid]);

  // Filter conversations based on selected tab, search query, and unread tab
  const filteredConversations = useMemo(() => {
    const tabFiltered = conversations.filter((conv) => {
      if (!user) return false;
      if (isConversationExpired(conv)) return false;
      if (activeTab === 'INBOX') {
        return conv.status !== 'pending' || conv.requestSenderId === user.uid;
      } else {
        return conv.status === 'pending' && conv.requestRecipientId === user.uid;
      }
    });

    return tabFiltered.filter((conv) => {
      if (!user) return false;
      const otherUid = conv.participants.find((p) => p !== user.uid);
      if (!otherUid) return false;

      const unread = conv.unreadCount?.[user.uid] || 0;
      if (filterMode === 'UNREAD' && unread === 0) return false;

      const fallbackProfile = conv.participantProfiles?.[otherUid];
      const liveProfile = cachedProfiles[otherUid] || userProfileCache.get(otherUid);

      const displayName = liveProfile?.displayName || fallbackProfile?.displayName || '';
      const username = liveProfile?.username || fallbackProfile?.username || '';
      const query = searchQuery.toLowerCase().trim();

      if (!query) return true;
      return displayName.toLowerCase().includes(query) || username.toLowerCase().includes(query);
    });
  }, [conversations, user, activeTab, searchQuery, filterMode, cachedProfiles]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full h-[85vh] max-h-[680px] flex flex-col shadow-2xl overflow-hidden my-auto animate-in zoom-in-95">
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between sticky top-0 z-10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <MessageSquare className="w-5 h-5" />
                </div>
                {inboxUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-slate-950">
                    {inboxUnreadCount}
                  </span>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">TruFit Inbox</h2>
                  {inboxUnreadCount > 0 && (
                    <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                      {inboxUnreadCount} New
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">Direct Messages & Athlete Inquiries</p>
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

          {/* 24-Hour Auto-Purge Notice */}
          <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 flex items-center justify-between text-[11px] text-amber-300 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="truncate">Direct chats automatically disappear after 24 hours.</span>
            </div>
            <span className="text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 px-1.5 py-0.5 rounded shrink-0 ml-2">
              24h Ephemeral
            </span>
          </div>

          {/* Main Tabs: Inbox vs Requests */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/40 shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('INBOX');
                setFilterMode('ALL');
              }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer ${
                activeTab === 'INBOX'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
              }`}
            >
              Inbox
              {inboxUnreadCount > 0 && (
                <span className="ml-1.5 bg-emerald-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {inboxUnreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('REQUESTS');
                setFilterMode('ALL');
              }}
              className={`flex-1 py-3 text-xs font-bold text-center border-b-2 transition-all cursor-pointer relative ${
                activeTab === 'REQUESTS'
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/20'
              }`}
            >
              Message Requests
              {requestsCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {requestsCount}
                </span>
              )}
            </button>
          </div>

          {/* Search Box & Tab Filter */}
          <div className="p-3 bg-slate-950/60 border-b border-slate-800/80 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or @username..."
                className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none transition-colors"
              />
            </div>

            {/* Quick Filter Bar */}
            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterMode('ALL')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === 'ALL'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  All ({activeTab === 'INBOX' ? conversations.filter(c => c.status !== 'pending' || c.requestSenderId === user?.uid).length : requestsCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('UNREAD')}
                  className={`px-3 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    filterMode === 'UNREAD'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  Unread ({activeTab === 'INBOX' ? inboxUnreadCount : 0})
                </button>
              </div>

              <span className="text-[10px] text-slate-500 font-medium">Sorted by Recent Activity</span>
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredConversations.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-700 text-slate-400 flex items-center justify-center">
                  <MessageSquare className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-200">
                    {activeTab === 'REQUESTS'
                      ? 'No message requests'
                      : filterMode === 'UNREAD' ? 'No unread messages' : 'No conversations found'}
                  </h4>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    {activeTab === 'REQUESTS'
                      ? 'New message requests from users who are not accepted connections or followers will appear here.'
                      : filterMode === 'UNREAD'
                      ? 'You are all caught up on your athlete and turf owner inquiries!'
                      : searchQuery
                      ? 'No athlete or turf owner matching your search query.'
                      : 'Visit any athlete or turf owner profile and tap Message to start a conversation!'}
                  </p>
                </div>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                if (!user) return null;
                const otherUid = conv.participants.find((p) => p !== user.uid);
                if (!otherUid) return null;

                const fallbackProfile = conv.participantProfiles?.[otherUid] || {
                  displayName: 'Athlete',
                  photoURL: '',
                  role: 'PLAYER',
                };
                const liveProfile = cachedProfiles[otherUid] || userProfileCache.get(otherUid);

                const displayName = liveProfile?.displayName || fallbackProfile.displayName || 'Athlete';
                const photoURL = liveProfile?.photoURL || fallbackProfile.photoURL || '';
                const role = liveProfile?.role || fallbackProfile.role || 'PLAYER';
                const username = liveProfile?.username || fallbackProfile.username || '';
                const lastActiveTime = liveProfile?.updatedAt || liveProfile?.createdAt || conv.updatedAt;

                const statusInfo = getActivityStatus(lastActiveTime);
                const unread = conv.unreadCount?.[user.uid] || 0;
                const formattedTime = formatRelativeTime(conv.lastMessageAt || conv.updatedAt);

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => {
                      if (user?.uid) {
                        markConversationAsRead(conv.id, user.uid);
                      }
                      setActiveTargetPlayer({
                        uid: otherUid,
                        displayName,
                        photoURL,
                        role,
                        username,
                      });
                    }}
                    className={`w-full p-3 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer group ${
                      unread > 0
                        ? 'bg-slate-900 border-emerald-500/40 shadow-md shadow-emerald-950/20'
                        : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    {/* User Avatar with Online Indicator */}
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center">
                        {photoURL ? (
                          <img
                            src={photoURL}
                            alt={displayName}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <User className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>

                      {/* Online Status Dot */}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                          statusInfo.isOnline ? 'bg-emerald-500' : 'bg-slate-600'
                        }`}
                        title={statusInfo.label}
                      />

                      {/* Unread Count Badge */}
                      {unread > 0 && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-slate-950 text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-slate-950 shadow-md">
                          {unread}
                        </span>
                      )}
                    </div>

                    {/* Conversation Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs font-bold text-white truncate">{displayName}</h4>
                          {role === 'OWNER' ? (
                            <span className="text-[8px] font-black uppercase text-amber-400 bg-amber-950/80 border border-amber-500/30 px-1 py-0.2 rounded shrink-0">
                              Owner
                            </span>
                          ) : role === 'COACH' ? (
                            <span className="text-[8px] font-black uppercase text-indigo-400 bg-indigo-950/80 border border-indigo-500/30 px-1 py-0.2 rounded shrink-0">
                              Coach
                            </span>
                          ) : null}
                          {username && (
                            <span className="text-[10px] text-slate-500 truncate hidden sm:inline">
                              @{username}
                            </span>
                          )}
                        </div>

                        <span
                          className={`text-[10px] shrink-0 font-medium ${
                            unread > 0 ? 'text-emerald-400 font-bold' : 'text-slate-500'
                          }`}
                        >
                          {formattedTime}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            unread > 0 ? 'font-bold text-white' : 'text-slate-400'
                          }`}
                        >
                          {conv.lastMessage || 'Conversation started'}
                        </p>

                        <span className="text-[9px] text-slate-500 shrink-0 hidden sm:inline">
                          {statusInfo.label}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-300 transition-colors shrink-0" />
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Direct Message Active Chat Modal */}
      <DirectMessageModal
        isOpen={!!activeTargetPlayer}
        targetPlayer={activeTargetPlayer}
        onClose={() => setActiveTargetPlayer(null)}
        showToast={showToast}
      />
    </>
  );
};

