import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getLobbies,
  toggleLobbyJoin,
  leaveLobby,
  deleteLobby,
  getLobbyParticipants,
  getUserProfileByUid,
  createLobbyWithSlotTransaction,
} from '../../services/communityService';
import { getTurfs, getArenasByTurf, getSlotsByArenaAndDate } from '../../services/dbService';
import { Lobby, Turf, Arena, Slot, LobbyPlayer, UserProfile } from '../../types';
import { LobbyCard } from '../../components/LobbyCard';
import { PlayerPublicProfileModal } from '../../components/PlayerPublicProfileModal';
import {
  Users,
  Plus,
  X,
  Calendar,
  Clock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  CreditCard,
  Building,
  Search,
  Trash2,
  LogOut,
  Crown,
  Activity,
  User,
  Shield,
  Eye,
  Check,
} from 'lucide-react-native';

export const LobbiesScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState('All');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'MY_LOBBIES'>('ALL');

  // Selected Lobby for Detailed View Modal
  const [selectedLobby, setSelectedLobby] = useState<Lobby | null>(null);
  const [lobbyParticipants, setLobbyParticipants] = useState<LobbyPlayer[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  // Player Profile Modal State
  const [viewingProfile, setViewingProfile] = useState<UserProfile | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);

  // Join & Payment Modal State
  const [joiningLobby, setJoiningLobby] = useState<Lobby | null>(null);
  const [joinPaymentMethod, setJoinPaymentMethod] = useState<'PAY_NOW' | 'PAY_LATER_AT_TURF'>('PAY_NOW');
  const [joining, setJoining] = useState(false);

  // Create Lobby Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [lobbyName, setLobbyName] = useState('');
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [dates, setDates] = useState<{ label: string; day: string; date: string }[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDay, setSelectedDay] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<Slot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [maxPlayers, setMaxPlayers] = useState('10');
  const [pricePerPlayer, setPricePerPlayer] = useState('150');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Action loading cache
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Generate 7-day schedule
  useEffect(() => {
    const nextDays = [];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      nextDays.push({ label, day: dayName, date: dateStr });
    }
    setDates(nextDays);
    setSelectedDate(nextDays[0].date);
    setSelectedDay(nextDays[0].day);
  }, []);

  const loadData = async () => {
    try {
      const [allLobbies, allTurfs] = await Promise.all([getLobbies(), getTurfs()]);
      setLobbies(allLobbies);
      setTurfs(allTurfs);
      if (allTurfs.length > 0 && !selectedTurf) {
        setSelectedTurf(allTurfs[0]);
      }
    } catch (err) {
      console.warn('Error loading lobbies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Fetch arenas when selected turf changes in create form
  useEffect(() => {
    if (!selectedTurf) return;
    getArenasByTurf(selectedTurf.id).then((arenaList) => {
      setArenas(arenaList);
      if (arenaList.length > 0) {
        setSelectedArena(arenaList[0]);
      } else {
        setSelectedArena(null);
      }
    });
  }, [selectedTurf]);

  // Fetch only AVAILABLE slots when arena or date changes
  useEffect(() => {
    if (!selectedArena || !selectedDate) {
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }
    setLoadingSlots(true);
    setSelectedSlot(null);
    getSlotsByArenaAndDate(selectedArena.id, selectedDate)
      .then((slotList) => {
        const freeSlots = slotList.filter((s) => s.status === 'AVAILABLE');
        setAvailableSlots(freeSlots);
        if (freeSlots.length > 0) {
          setSelectedSlot(freeSlots[0]);
          const perPlayer = Math.round(freeSlots[0].price / (parseInt(maxPlayers, 10) || 10));
          setPricePerPlayer(String(perPlayer));
          setLobbyName(`${selectedArena.sport || 'Sports'} Match at ${selectedTurf?.name}`);
        }
      })
      .catch((err) => console.warn('Error fetching slots:', err))
      .finally(() => setLoadingSlots(false));
  }, [selectedArena, selectedDate]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Open Lobby Detail View & Fetch Roster
  const handleOpenLobbyDetails = async (lobby: Lobby) => {
    setSelectedLobby(lobby);
    setLoadingParticipants(true);
    try {
      const participants = await getLobbyParticipants(lobby.id);
      setLobbyParticipants(participants);
    } catch (err) {
      console.warn('Error fetching participants:', err);
    } finally {
      setLoadingParticipants(false);
    }
  };

  // Open Player Profile Modal by UID
  const handleOpenPlayerProfile = async (uid: string) => {
    setLoadingProfile(true);
    try {
      const athleteProfile = await getUserProfileByUid(uid);
      if (athleteProfile) {
        setViewingProfile(athleteProfile);
        setShowProfileModal(true);
      } else {
        Alert.alert('Profile', 'Athlete profile details unavailable.');
      }
    } catch (err) {
      console.warn('Error loading player profile:', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Handle "I'M IN" -> Open Payment Prompt
  const handleInitiateJoin = (lobby: Lobby) => {
    if (!user || !profile) {
      Alert.alert('Sign In Required', 'Please sign in to join pick-up lobbies.');
      return;
    }

    if (lobby.currentPlayers >= lobby.maxPlayers) {
      Alert.alert('Lobby Full', 'Sorry, this lobby has reached its maximum player capacity.');
      return;
    }

    setJoiningLobby(lobby);
    setJoinPaymentMethod('PAY_NOW');
  };

  // Handle Confirm Join with Payment Choice
  const handleConfirmJoinLobby = async () => {
    if (!user || !profile || !joiningLobby) return;
    setJoining(true);
    try {
      await toggleLobbyJoin(
        joiningLobby.id,
        user.uid,
        profile.displayName || user.displayName || 'Athlete',
        profile.photoURL,
        joinPaymentMethod,
        user.email || ''
      );
      setJoiningLobby(null);
      await loadData();
      if (selectedLobby && selectedLobby.id === joiningLobby.id) {
        handleOpenLobbyDetails(joiningLobby);
      }
      Alert.alert(
        'Joined Successfully!',
        joinPaymentMethod === 'PAY_NOW'
          ? `Payment of ₹${joiningLobby.pricePerPlayer || 200} cleared online. See you on the pitch!`
          : `You are in! Please pay ₹${joiningLobby.pricePerPlayer || 200} at the turf counter on match day.`
      );
    } catch (err: any) {
      Alert.alert('Unable to Join', err.message || 'Please try again.');
    } finally {
      setJoining(false);
    }
  };

  // Handle "I'M OUT" (Leave Lobby)
  const handleLeaveLobby = (lobby: Lobby) => {
    if (!user) return;

    if (lobby.hostId === user.uid) {
      Alert.alert('Host Action', 'As host, you can delete or dissolve the lobby.');
      return;
    }

    Alert.alert(
      'Leave Lobby',
      `Are you sure you want to step out of "${lobby.name}"? Your slot will be freed for other athletes.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: "I'm Out",
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(lobby.id);
            try {
              await leaveLobby(lobby.id, user.uid);
              await loadData();
              if (selectedLobby && selectedLobby.id === lobby.id) {
                handleOpenLobbyDetails(lobby);
              }
              Alert.alert('Stepped Out', 'You have left the lobby.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to leave lobby.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Handle Delete / Dissolve Lobby (For Host)
  const handleDeleteLobby = (lobby: Lobby) => {
    if (!user || user.uid !== lobby.hostId) {
      Alert.alert('Unauthorized', 'Only the lobby creator can delete this lobby.');
      return;
    }

    Alert.alert(
      'Delete Lobby',
      `Are you sure you want to delete "${lobby.name}"? The turf slot reservation will be released back for other players.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Lobby',
          style: 'destructive',
          onPress: async () => {
            setActionLoadingId(lobby.id);
            try {
              await deleteLobby(lobby.id, user.uid);
              if (selectedLobby && selectedLobby.id === lobby.id) {
                setSelectedLobby(null);
              }
              await loadData();
              Alert.alert('Lobby Deleted', 'Matchmaking lobby dissolved and turf slot released.');
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to delete lobby.');
            } finally {
              setActionLoadingId(null);
            }
          },
        },
      ]
    );
  };

  // Handle Create Lobby
  const handleCreateLobby = async () => {
    if (!user || !profile) return;
    if (!lobbyName.trim()) {
      setCreateError('Please enter a lobby name.');
      return;
    }
    if (!selectedTurf || !selectedArena || !selectedSlot) {
      setCreateError('Please select an available slot.');
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      await createLobbyWithSlotTransaction({
        hostId: user.uid,
        hostName: profile.displayName || user.displayName || 'Athlete',
        hostEmail: user.email || '',
        hostPhone: profile.phoneNumber || '',
        hostPhotoURL: profile.photoURL || null,
        turfId: selectedTurf.id,
        turfName: selectedTurf.name,
        turfAddress: selectedTurf.address || '',
        turfCity: selectedTurf.city || 'City',
        arenaId: selectedArena.id,
        arenaName: selectedArena.name,
        sport: selectedArena.sport || selectedTurf.sports?.[0] || 'Football',
        slotId: selectedSlot.id,
        date: selectedDate,
        day: selectedDay,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: selectedSlot.durationMinutes || 60,
        totalAmount: selectedSlot.price,
        lobbyName: lobbyName.trim(),
        maxPlayers: parseInt(maxPlayers, 10) || 10,
        minPlayers: 2,
        pricePerPlayer: parseInt(pricePerPlayer, 10) || Math.round(selectedSlot.price / 10),
        paymentMethod: 'PAY_LATER_AT_TURF',
      });
      setShowCreateModal(false);
      setLobbyName('');
      await loadData();
      Alert.alert('Lobby Created!', 'Your slot is confirmed and open for athletes to join.');
    } catch (err: any) {
      const msg = err.message || 'This slot is no longer available. Please choose another slot.';
      setCreateError(msg);
    } finally {
      setCreating(false);
    }
  };

  // Filtered lobbies
  const filteredLobbies = lobbies.filter((l) => {
    const isJoined = l.players?.some((p) => p.playerId === user?.uid || p.uid === user?.uid);
    const isHost = l.hostId === user?.uid;

    if (selectedSport !== 'All' && l.sport?.toLowerCase() !== selectedSport.toLowerCase()) {
      return false;
    }

    if (statusFilter === 'OPEN' && (l.currentPlayers >= l.maxPlayers || l.status !== 'OPEN')) {
      return false;
    }

    if (statusFilter === 'MY_LOBBIES' && !isHost && !isJoined) {
      return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = l.name?.toLowerCase().includes(q);
      const matchTurf = l.turfName?.toLowerCase().includes(q);
      const matchCity = l.turfCity?.toLowerCase().includes(q);
      const matchHost = l.hostName?.toLowerCase().includes(q);
      if (!matchName && !matchTurf && !matchCity && !matchHost) return false;
    }

    return true;
  });

  return (
    <View style={styles.container}>
      {/* Search & Header Section */}
      <View style={styles.topSection}>
        <View style={styles.searchBar}>
          <Search size={16} color="#64748b" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search matches, venues, or hosts..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Status Filter Tabs */}
        <View style={styles.statusTabsRow}>
          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'ALL' && styles.statusTabActive]}
            onPress={() => setStatusFilter('ALL')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'ALL' && styles.statusTabTextActive]}>
              All Matches ({lobbies.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'OPEN' && styles.statusTabActive]}
            onPress={() => setStatusFilter('OPEN')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'OPEN' && styles.statusTabTextActive]}>
              Open Spots
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statusTab, statusFilter === 'MY_LOBBIES' && styles.statusTabActive]}
            onPress={() => setStatusFilter('MY_LOBBIES')}
          >
            <Text style={[styles.statusTabText, statusFilter === 'MY_LOBBIES' && styles.statusTabTextActive]}>
              My Lobbies
            </Text>
          </TouchableOpacity>
        </View>

        {/* Sports Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sportsScroll}>
          {['All', 'Football', 'Cricket', 'Badminton', 'Basketball', 'Tennis', 'Pickleball'].map(
            (sport) => (
              <TouchableOpacity
                key={sport}
                style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
                onPress={() => setSelectedSport(sport)}
              >
                <Text style={[styles.sportChipText, selectedSport === sport && styles.sportChipTextActive]}>
                  {sport}
                </Text>
              </TouchableOpacity>
            )
          )}
        </ScrollView>
      </View>

      {/* Lobbies List */}
      <FlatList
        data={filteredLobbies}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        renderItem={({ item }) => {
          const isJoined = item.players?.some((p) => p.playerId === user?.uid || p.uid === user?.uid);
          const isHost = item.hostId === user?.uid;

          return (
            <LobbyCard
              lobby={item}
              isJoined={isJoined}
              isHost={isHost}
              onJoinToggle={() => {
                if (isJoined) {
                  handleLeaveLobby(item);
                } else {
                  handleInitiateJoin(item);
                }
              }}
              onPressCard={() => handleOpenLobbyDetails(item)}
              onDeleteLobby={() => handleDeleteLobby(item)}
              onPressHostProfile={(hostId) => handleOpenPlayerProfile(hostId)}
              onPressPlayerProfile={(playerId) => handleOpenPlayerProfile(playerId)}
            />
          );
        }}
        ListEmptyComponent={
          loading ? (
            <View style={styles.emptyBox}>
              <ActivityIndicator size="large" color="#38bdf8" />
              <Text style={styles.emptyTitle}>Loading active lobbies...</Text>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Users size={44} color="#334155" />
              <Text style={styles.emptyTitle}>No Matching Lobbies</Text>
              <Text style={styles.emptyDesc}>
                {searchQuery || selectedSport !== 'All' || statusFilter !== 'ALL'
                  ? 'Try clearing filters or search terms.'
                  : 'Be the first athlete to create a community match lobby!'}
              </Text>
            </View>
          )
        }
      />

      {/* Floating Create Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setCreateError(null);
          setShowCreateModal(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={18} color="#064e3b" />
        <Text style={styles.fabText}>Host Lobby</Text>
      </TouchableOpacity>

      {/* ==================================================== */}
      {/* 1. LOBBY DETAILS & PLAYERS ROSTER MODAL */}
      {/* ==================================================== */}
      {selectedLobby && (
        <Modal visible={!!selectedLobby} animationType="slide" transparent onRequestClose={() => setSelectedLobby(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCardLarge}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={{ flex: 1 }}>
                  <View style={styles.modalBadgeRow}>
                    <Text style={styles.sportBadgeLarge}>{(selectedLobby.sport || 'Sports').toUpperCase()}</Text>
                    <Text style={styles.statusBadgeLarge}>{selectedLobby.status}</Text>
                  </View>
                  <Text style={styles.modalTitleLarge} numberOfLines={1}>
                    {selectedLobby.name}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedLobby(null)} style={styles.closeBtn}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalScrollBody} showsVerticalScrollIndicator={false}>
                {/* Creator Profile Card */}
                <View style={styles.creatorHeroCard}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => selectedLobby.hostId && handleOpenPlayerProfile(selectedLobby.hostId)}
                    style={styles.creatorHeroProfile}
                  >
                    {selectedLobby.hostPhotoURL ? (
                      <Image source={{ uri: selectedLobby.hostPhotoURL }} style={styles.creatorHeroAvatar} />
                    ) : (
                      <View style={styles.creatorHeroAvatarPlaceholder}>
                        <Text style={styles.creatorHeroAvatarText}>
                          {(selectedLobby.hostName || 'H').charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={styles.creatorTagRow}>
                        <Crown size={12} color="#f59e0b" />
                        <Text style={styles.creatorTagLabel}>Lobby Creator & Host</Text>
                      </View>
                      <Text style={styles.creatorHeroName}>{selectedLobby.hostName || 'Athlete Host'}</Text>
                      <Text style={styles.tapProfileHint}>Tap to view host athlete profile ➔</Text>
                    </View>
                  </TouchableOpacity>

                  {user?.uid === selectedLobby.hostId && (
                    <TouchableOpacity
                      style={styles.deleteLobbyBtn}
                      onPress={() => handleDeleteLobby(selectedLobby)}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={14} color="#ef4444" />
                      <Text style={styles.deleteLobbyBtnText}>Delete Lobby</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Venue & Slot Overview */}
                <View style={styles.detailSectionBox}>
                  <Text style={styles.detailSectionLabel}>Venue & Slot Information</Text>
                  <View style={styles.detailInfoRow}>
                    <Building size={14} color="#38bdf8" />
                    <Text style={styles.detailInfoTextBold}>{selectedLobby.turfName}</Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <MapPin size={14} color="#94a3b8" />
                    <Text style={styles.detailInfoText}>
                      {selectedLobby.arenaName} • {selectedLobby.turfAddress || selectedLobby.turfCity}
                    </Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Calendar size={14} color="#818cf8" />
                    <Text style={styles.detailInfoText}>
                      {selectedLobby.date} ({selectedLobby.day || 'Match'})
                    </Text>
                  </View>
                  <View style={styles.detailInfoRow}>
                    <Clock size={14} color="#10b981" />
                    <Text style={styles.detailInfoText}>
                      {selectedLobby.startTime} - {selectedLobby.endTime} (₹{selectedLobby.pricePerPlayer || 200}/player)
                    </Text>
                  </View>
                </View>

                {/* Description & Rules */}
                {selectedLobby.description ? (
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionLabel}>Match Notes</Text>
                    <Text style={styles.notesBodyText}>{selectedLobby.description}</Text>
                  </View>
                ) : null}

                {/* Players Who Are In (Full List) */}
                <View style={styles.detailSectionBox}>
                  <View style={styles.rosterTitleRow}>
                    <Text style={styles.detailSectionLabel}>
                      Players In Lobby ({lobbyParticipants.length || selectedLobby.currentPlayers}/{selectedLobby.maxPlayers})
                    </Text>
                    <Text style={styles.spotsCountText}>
                      {Math.max(0, selectedLobby.maxPlayers - (lobbyParticipants.length || selectedLobby.currentPlayers))} spots left
                    </Text>
                  </View>

                  {loadingParticipants ? (
                    <ActivityIndicator size="small" color="#38bdf8" style={{ marginVertical: 10 }} />
                  ) : lobbyParticipants.length === 0 ? (
                    <Text style={styles.emptyRosterText}>No players registered yet.</Text>
                  ) : (
                    <View style={styles.rosterList}>
                      {lobbyParticipants.map((p, idx) => {
                        const isMe = p.uid === user?.uid;
                        const isHostPlayer = p.isHost || p.uid === selectedLobby.hostId;

                        return (
                          <TouchableOpacity
                            key={p.id || String(idx)}
                            activeOpacity={0.8}
                            onPress={() => handleOpenPlayerProfile(p.uid)}
                            style={styles.rosterItem}
                          >
                            <View style={styles.rosterItemLeft}>
                              <Text style={styles.rosterItemIndex}>{idx + 1}</Text>
                              {p.playerPhotoURL ? (
                                <Image source={{ uri: p.playerPhotoURL }} style={styles.rosterItemAvatar} />
                              ) : (
                                <View style={[styles.rosterItemAvatarPlaceholder, isHostPlayer && styles.hostAvatarPlaceholder]}>
                                  <Text style={styles.rosterItemAvatarText}>
                                    {(p.playerName || 'P').charAt(0).toUpperCase()}
                                  </Text>
                                </View>
                              )}
                              <View>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                  <Text style={styles.rosterItemName} numberOfLines={1}>
                                    {p.playerName} {isMe ? '(You)' : ''}
                                  </Text>
                                  {isHostPlayer && (
                                    <View style={styles.hostBadge}>
                                      <Text style={styles.hostBadgeText}>Host</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.rosterItemSport}>
                                  {p.preferredSport || selectedLobby.sport} • {p.skillLevel || 'Athlete'}
                                </Text>
                              </View>
                            </View>

                            <View style={styles.viewProfileChip}>
                              <Text style={styles.viewProfileChipText}>Profile</Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Modal Footer Controls */}
              <View style={styles.modalFooterLarge}>
                {selectedLobby.players?.some((p) => p.playerId === user?.uid || p.uid === user?.uid) ? (
                  <View style={styles.footerJoinedRow}>
                    <View style={styles.joinedConfirmTag}>
                      <Check size={14} color="#10b981" />
                      <Text style={styles.joinedConfirmText}>You're In This Match</Text>
                    </View>
                    {selectedLobby.hostId !== user?.uid && (
                      <TouchableOpacity
                        style={styles.leaveLobbyBtn}
                        onPress={() => {
                          handleLeaveLobby(selectedLobby);
                        }}
                        activeOpacity={0.85}
                      >
                        <LogOut size={14} color="#ef4444" />
                        <Text style={styles.leaveLobbyBtnText}>I'm Out</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                ) : selectedLobby.currentPlayers >= selectedLobby.maxPlayers ? (
                  <View style={styles.fullLobbyBadge}>
                    <Text style={styles.fullLobbyText}>Lobby Full</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.joinPrimaryBtn}
                    onPress={() => {
                      handleInitiateJoin(selectedLobby);
                    }}
                    activeOpacity={0.85}
                  >
                    <Plus size={18} color="#064e3b" />
                    <Text style={styles.joinPrimaryBtnText}>
                      I'm In (₹{selectedLobby.pricePerPlayer || 200})
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* 2. PLAYER ATHLETE PROFILE MODAL */}
      {/* ==================================================== */}
      <PlayerPublicProfileModal
        visible={showProfileModal}
        profile={viewingProfile}
        onClose={() => {
          setShowProfileModal(false);
          setViewingProfile(null);
        }}
      />

      {/* ==================================================== */}
      {/* 3. JOIN & PAYMENT METHOD CHOICE MODAL */}
      {/* ==================================================== */}
      {joiningLobby && (
        <Modal visible={!!joiningLobby} animationType="slide" transparent onRequestClose={() => setJoiningLobby(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Join Match Lobby</Text>
                <TouchableOpacity onPress={() => setJoiningLobby(null)}>
                  <X size={20} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              <Text style={styles.joinSubText}>
                Select how you would like to handle your match fee (₹{joiningLobby.pricePerPlayer || 200}) for "{joiningLobby.name}".
              </Text>

              {/* Payment Option 1: Pay Now */}
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  joinPaymentMethod === 'PAY_NOW' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setJoinPaymentMethod('PAY_NOW')}
                activeOpacity={0.85}
              >
                <CreditCard size={20} color={joinPaymentMethod === 'PAY_NOW' ? '#10b981' : '#94a3b8'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionTitle}>Pay Now Online (Razorpay)</Text>
                  <Text style={styles.paymentOptionSubtitle}>Instant verification & guaranteed slot</Text>
                </View>
                <View style={[styles.radioCircle, joinPaymentMethod === 'PAY_NOW' && styles.radioCircleActive]}>
                  {joinPaymentMethod === 'PAY_NOW' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              {/* Payment Option 2: Pay Later at Turf */}
              <TouchableOpacity
                style={[
                  styles.paymentOptionCard,
                  joinPaymentMethod === 'PAY_LATER_AT_TURF' && styles.paymentOptionCardActive,
                ]}
                onPress={() => setJoinPaymentMethod('PAY_LATER_AT_TURF')}
                activeOpacity={0.85}
              >
                <Building size={20} color={joinPaymentMethod === 'PAY_LATER_AT_TURF' ? '#10b981' : '#94a3b8'} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.paymentOptionTitle}>Pay Later at Turf Counter</Text>
                  <Text style={styles.paymentOptionSubtitle}>Pay at venue desk before kickoff</Text>
                </View>
                <View style={[styles.radioCircle, joinPaymentMethod === 'PAY_LATER_AT_TURF' && styles.radioCircleActive]}>
                  {joinPaymentMethod === 'PAY_LATER_AT_TURF' && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.createBtn, joining && styles.disabledBtn]}
                onPress={handleConfirmJoinLobby}
                disabled={joining}
                activeOpacity={0.85}
              >
                {joining ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Confirm & Join Match</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}

      {/* ==================================================== */}
      {/* 4. CREATE LOBBY MODAL */}
      {/* ==================================================== */}
      <Modal visible={showCreateModal} animationType="slide" transparent onRequestClose={() => setShowCreateModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Host a Game Lobby</Text>
              <TouchableOpacity onPress={() => setShowCreateModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Lobby Title</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 5v5 Friday Night Kickoff"
                placeholderTextColor="#64748b"
                value={lobbyName}
                onChangeText={setLobbyName}
              />

              {/* Select Turf */}
              <Text style={styles.label}>1. Select Arena Turf</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {turfs.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.turfPill, selectedTurf?.id === t.id && styles.turfPillActive]}
                    onPress={() => setSelectedTurf(t)}
                  >
                    <Text style={[styles.turfPillText, selectedTurf?.id === t.id && styles.turfPillTextActive]}>
                      {t.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Select Pitch / Arena */}
              {arenas.length > 0 && (
                <>
                  <Text style={styles.label}>2. Select Pitch / Sport</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {arenas.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        style={[styles.arenaPill, selectedArena?.id === a.id && styles.arenaPillActive]}
                        onPress={() => setSelectedArena(a)}
                      >
                        <Text style={[styles.arenaPillText, selectedArena?.id === a.id && styles.arenaPillTextActive]}>
                          {a.name} ({a.sport})
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              {/* 7-Day Date Selector */}
              <Text style={styles.label}>3. Select Date (7-Day Booking Window)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                {dates.map((d) => (
                  <TouchableOpacity
                    key={d.date}
                    style={[styles.datePill, selectedDate === d.date && styles.datePillActive]}
                    onPress={() => {
                      setSelectedDate(d.date);
                      setSelectedDay(d.day);
                    }}
                  >
                    <Text style={[styles.datePillDay, selectedDate === d.date && styles.datePillDayActive]}>
                      {d.day.slice(0, 3)}
                    </Text>
                    <Text style={[styles.datePillLabel, selectedDate === d.date && styles.datePillLabelActive]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Available Slots Only */}
              <Text style={styles.label}>4. Choose Available Slot</Text>
              {loadingSlots ? (
                <ActivityIndicator color="#10b981" style={{ marginVertical: 10 }} />
              ) : availableSlots.length === 0 ? (
                <View style={styles.noSlotWarning}>
                  <AlertTriangle size={14} color="#f59e0b" />
                  <Text style={styles.noSlotText}>
                    No available slots on this date. Please pick another date or turf.
                  </Text>
                </View>
              ) : (
                <View style={styles.slotsGrid}>
                  {availableSlots.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[styles.slotCard, selectedSlot?.id === s.id && styles.slotCardActive]}
                      onPress={() => {
                        setSelectedSlot(s);
                        const per = Math.round(s.price / (parseInt(maxPlayers, 10) || 10));
                        setPricePerPlayer(String(per));
                      }}
                    >
                      <Text style={[styles.slotTime, selectedSlot?.id === s.id && styles.slotTimeActive]}>
                        {s.startTime} - {s.endTime}
                      </Text>
                      <Text style={styles.slotPrice}>₹{s.price}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Max Players</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={maxPlayers}
                    onChangeText={(val) => {
                      setMaxPlayers(val);
                      if (selectedSlot && parseInt(val, 10) > 0) {
                        setPricePerPlayer(String(Math.round(selectedSlot.price / parseInt(val, 10))));
                      }
                    }}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Cost / Player (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={pricePerPlayer}
                    onChangeText={setPricePerPlayer}
                  />
                </View>
              </View>

              {createError && (
                <View style={styles.errorBox}>
                  <AlertTriangle size={16} color="#ef4444" />
                  <Text style={styles.errorText}>{createError}</Text>
                </View>
              )}
            </ScrollView>

            <TouchableOpacity
              style={[styles.createBtn, (creating || !selectedSlot) && styles.disabledBtn]}
              onPress={handleCreateLobby}
              disabled={creating || !selectedSlot}
            >
              {creating ? (
                <ActivityIndicator color="#064e3b" />
              ) : (
                <Text style={styles.createBtnText}>Confirm Slot & Launch Lobby</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131d33',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  statusTabsRow: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 10,
    padding: 3,
    marginBottom: 10,
  },
  statusTab: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
  },
  statusTabActive: {
    backgroundColor: '#10b981',
  },
  statusTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  statusTabTextActive: {
    color: '#064e3b',
  },
  sportsScroll: {
    flexDirection: 'row',
    paddingBottom: 4,
  },
  sportChip: {
    backgroundColor: '#131d33',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginRight: 8,
  },
  sportChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    borderColor: '#38bdf8',
  },
  sportChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  sportChipTextActive: {
    color: '#38bdf8',
  },
  listContent: {
    padding: 16,
    paddingBottom: 95,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#10b981',
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  fabText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  modalCardLarge: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '88%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  modalBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sportBadgeLarge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  statusBadgeLarge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  modalTitleLarge: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  closeBtn: {
    padding: 4,
  },
  modalScrollBody: {
    padding: 18,
  },
  creatorHeroCard: {
    backgroundColor: '#131d33',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  creatorHeroProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  creatorHeroAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#1e293b',
  },
  creatorHeroAvatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderWidth: 1.5,
    borderColor: 'rgba(245, 158, 11, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorHeroAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f59e0b',
  },
  creatorTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  creatorTagLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#f59e0b',
    textTransform: 'uppercase',
  },
  creatorHeroName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  tapProfileHint: {
    fontSize: 11,
    color: '#38bdf8',
    marginTop: 2,
    fontWeight: '600',
  },
  deleteLobbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingVertical: 9,
    marginTop: 12,
  },
  deleteLobbyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ef4444',
  },
  detailSectionBox: {
    backgroundColor: '#131b2e',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 14,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  detailInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  detailInfoTextBold: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailInfoText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  notesBodyText: {
    fontSize: 12,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  rosterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  spotsCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#38bdf8',
  },
  emptyRosterText: {
    fontSize: 12,
    color: '#64748b',
  },
  rosterList: {
    gap: 8,
  },
  rosterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1220',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  rosterItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  rosterItemIndex: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    width: 14,
    textAlign: 'center',
  },
  rosterItemAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e293b',
  },
  rosterItemAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hostAvatarPlaceholder: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
  },
  rosterItemAvatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  rosterItemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    maxWidth: 130,
  },
  hostBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  hostBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#000000',
  },
  rosterItemSport: {
    fontSize: 11,
    color: '#94a3b8',
  },
  viewProfileChip: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  viewProfileChipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
  },
  modalFooterLarge: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0c1220',
  },
  footerJoinedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  joinedConfirmTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    flex: 1,
  },
  joinedConfirmText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#10b981',
  },
  leaveLobbyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  leaveLobbyBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ef4444',
  },
  fullLobbyBadge: {
    backgroundColor: '#1e293b',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  fullLobbyText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  joinPrimaryBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: 12,
  },
  joinPrimaryBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064e3b',
  },
  joinSubText: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 16,
    lineHeight: 18,
  },
  paymentOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#0c1220',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  paymentOptionCardActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  paymentOptionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  paymentOptionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleActive: {
    borderColor: '#10b981',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 6,
  },
  horizontalScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  turfPill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  turfPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  turfPillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  turfPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  arenaPill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
  },
  arenaPillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  arenaPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  arenaPillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  datePill: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 8,
    alignItems: 'center',
  },
  datePillActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  datePillDay: {
    fontSize: 9,
    color: '#94a3b8',
    fontWeight: '700',
  },
  datePillDayActive: {
    color: '#064e3b',
  },
  datePillLabel: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '800',
  },
  datePillLabelActive: {
    color: '#064e3b',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  slotCard: {
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: '47%',
  },
  slotCardActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  slotTime: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  slotTimeActive: {
    color: '#10b981',
  },
  slotPrice: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  noSlotWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  noSlotText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
  },
  col: {
    flex: 1,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  createBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 10,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});
