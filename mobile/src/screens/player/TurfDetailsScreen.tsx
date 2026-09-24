import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Linking,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { getTurfById, getArenasByTurf } from '../../services/dbService';
import { getTurfReviews, getLobbies, getPlayerPools, isLobbyConcluded, getActiveOffersByTurf } from '../../services/communityService';
import { Turf, Arena, TurfReview, Lobby, PlayerPool, Offer } from '../../types';
import { useLocation } from '../../contexts/LocationContext';
import {
  MapPin,
  Star,
  Phone,
  Navigation,
  CheckCircle,
  Share2,
  Calendar,
  Clock,
  Users,
  Sparkles,
  Zap,
  ArrowRight,
  UserPlus,
  ShieldCheck,
  Camera,
  Tag,
} from 'lucide-react-native';

interface TurfDetailsScreenProps {
  route: { params: { turfId: string } };
  navigation: any;
}

export const TurfDetailsScreen: React.FC<TurfDetailsScreenProps> = ({ route, navigation }) => {
  const { turfId } = route.params;
  const { formatDistance } = useLocation();
  const [turf, setTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [reviews, setReviews] = useState<TurfReview[]>([]);
  const [turfLobbies, setTurfLobbies] = useState<Lobby[]>([]);
  const [turfPools, setTurfPools] = useState<PlayerPool[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [turfData, arenaData, reviewData, allLobbies, allPools, offerData] = await Promise.all([
          getTurfById(turfId),
          getArenasByTurf(turfId),
          getTurfReviews(turfId),
          getLobbies(),
          getPlayerPools(),
          getActiveOffersByTurf(turfId),
        ]);
        setTurf(turfData);
        setArenas(arenaData);
        setReviews(reviewData);
        setOffers(offerData || []);
        
        // Filter active open lobbies for this specific turf (exclude concluded matches)
        const matchingLobbies = allLobbies.filter((l) => l.turfId === turfId && l.status === 'OPEN' && !isLobbyConcluded(l));
        setTurfLobbies(matchingLobbies);

        // Filter pools for the sports/city of this turf
        const matchingPools = allPools.filter((p) => 
          (turfData?.sports && turfData.sports.includes(p.sport)) ||
          p.city?.toLowerCase() === turfData?.city?.toLowerCase()
        );
        setTurfPools(matchingPools);
      } catch (err) {
        console.warn('Error loading turf details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [turfId]);

  const getSportEmoji = (sport?: string) => {
    const s = (sport || '').toLowerCase();
    if (s.includes('cricket')) return '🏏';
    if (s.includes('football') || s.includes('soccer')) return '⚽';
    if (s.includes('badminton')) return '🏸';
    if (s.includes('pickleball')) return '🏓';
    if (s.includes('tennis')) return '🎾';
    if (s.includes('basketball')) return '🏀';
    if (s.includes('volleyball')) return '🏐';
    return '🏆';
  };

  const handleOpenDirections = () => {
    if (!turf) return;
    if (turf.locationUrl && (turf.locationUrl.startsWith('http://') || turf.locationUrl.startsWith('https://'))) {
      Linking.openURL(turf.locationUrl);
      return;
    }
    const lat = turf.latitude || 19.076;
    const lng = turf.longitude || 72.8777;
    const label = encodeURIComponent(turf.name);
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(${label})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url as string);
  };

  const handleCall = () => {
    if (turf?.phoneNumber) {
      Linking.openURL(`tel:${turf.phoneNumber}`);
    }
  };

  if (loading || !turf) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  const hasRealTurfPhotos = Boolean(turf.photos && turf.photos.length > 0 && turf.photos[0]);
  const mainPhoto = hasRealTurfPhotos ? turf.photos![0] : null;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Image or Branded Transparent Placeholder */}
        {hasRealTurfPhotos ? (
          <View style={styles.bannerWrapper}>
            <Image source={{ uri: mainPhoto! }} style={styles.bannerImage} resizeMode="cover" />
            <View style={styles.bannerVerifiedBadge}>
              <Camera size={12} color="#38bdf8" />
              <Text style={styles.bannerVerifiedBadgeText}>
                {turf.photos!.length > 1 ? `Verified Owner Photos (${turf.photos!.length})` : 'Verified Owner Photo'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.brandedTurfBannerPlaceholder}>
            <View style={styles.bannerPlaceholderTopRow}>
              <View style={styles.bannerVerifiedPill}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={styles.bannerVerifiedPillText}>Verified Sports Facility</Text>
              </View>
              <Text style={{ fontSize: 24 }}>
                {getSportEmoji(turf.sports?.[0])}
              </Text>
            </View>

            <View style={styles.bannerPlaceholderCenter}>
              <ShieldCheck size={36} color="#10b981" style={{ marginBottom: 6 }} />
              <Text style={styles.bannerPlaceholderTitle}>
                Photo not uploaded by venue owner yet – Verified Turf
              </Text>
              <Text style={styles.bannerPlaceholderDesc}>
                Facility details, court dimensions, lighting, and slots are certified by TruFit. Real photos will appear as soon as uploaded by the venue.
              </Text>
            </View>

            <View style={styles.bannerPlaceholderFooter}>
              <Text style={styles.bannerPlaceholderFooterText}>
                🛡️ 100% Genuine Venue • No Stock Images Used
              </Text>
            </View>
          </View>
        )}

        <View style={styles.content}>
          {/* Title and Rating */}
          <View style={styles.headerRow}>
            <View style={styles.titleWrapper}>
              <Text style={styles.turfName}>{turf.name}</Text>
              <View style={styles.locationRow}>
                <MapPin size={14} color="#94a3b8" />
                <Text style={styles.locationText}>
                  {turf.address}, {turf.area}, {turf.city} ({formatDistance(turf.latitude, turf.longitude)})
                </Text>
              </View>
            </View>

            <View style={styles.ratingBadge}>
              <Star size={14} color="#f59e0b" fill="#f59e0b" />
              <Text style={styles.ratingText}>4.8</Text>
            </View>
          </View>

          {/* Action Pills */}
          <View style={styles.actionPillsRow}>
            <TouchableOpacity style={styles.actionPill} onPress={handleOpenDirections}>
              <Navigation size={14} color="#10b981" />
              <Text style={styles.actionPillText}>Directions</Text>
            </TouchableOpacity>

            {!!turf.phoneNumber && (
              <TouchableOpacity style={styles.actionPill} onPress={handleCall}>
                <Phone size={14} color="#38bdf8" />
                <Text style={styles.actionPillText}>Call Turf</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.actionPill}
              onPress={() => navigation.navigate('Lobbies')}
            >
              <Users size={14} color="#a855f7" />
              <Text style={styles.actionPillText}>Community</Text>
            </TouchableOpacity>
          </View>

          {/* Venue Active Offers Banner */}
          {offers.length > 0 && (
            <View style={{ backgroundColor: '#131b2e', borderRadius: 14, padding: 14, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Tag size={16} color="#f59e0b" />
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#f8fafc' }}>Active Deals & Promo Offers</Text>
                </View>
                <View style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: '#fbbf24' }}>{offers.length} DEALS</Text>
                </View>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {offers.map((off) => (
                  <View key={off.id} style={{ width: 180, backgroundColor: '#0f172a', padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1e293b' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, fontWeight: '900', color: '#f59e0b' }}>{off.code}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '800', color: '#34d399' }}>
                        {off.discountType === 'PERCENTAGE' ? `${off.discountValue}% OFF` : `₹${off.discountValue} OFF`}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#e2e8f0', marginTop: 4 }} numberOfLines={1}>
                      {off.name || off.title || 'Turf Special'}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#64748b', marginTop: 2 }} numberOfLines={1}>{off.description}</Text>
                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#38bdf8', marginTop: 6 }}>Apply at Booking ➔</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Available Grounds & Pitches Showcase */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkles size={16} color="#10b981" />
                  <Text style={styles.sectionTitle}>
                    Pitches & Arenas ({arenas.length || 1})
                  </Text>
                </View>
                <Text style={styles.sectionSubtitle}>
                  Choose a ground to view live time slots & reserve
                </Text>
              </View>
              {arenas.length > 1 && (
                <View style={styles.swipeHintBadge}>
                  <Text style={styles.swipeHintText}>Swipe Grounds ➔</Text>
                </View>
              )}
            </View>

            {arenas.length > 0 ? (
              <ScrollView
                horizontal={arenas.length > 1}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={arenas.length > 1 ? styles.pitchCarousel : undefined}
              >
                {arenas.map((arena: Arena) => {
                  const isMaintenance = !!arena.isUnderMaintenance;
                  const pitchPhoto = arena.photos?.[0] || turf.photos?.[0];
                  const hasRealPhoto = !!(arena.photos?.[0] || turf.photos?.[0]);
                  const sportEmoji = getSportEmoji(arena.sport);

                  return (
                    <View
                      key={arena.id}
                      style={[
                        styles.pitchShowcaseCard,
                        arenas.length > 1 ? styles.pitchShowcaseCardCarousel : styles.pitchShowcaseCardFull,
                        isMaintenance && styles.pitchCardMaintenance,
                      ]}
                    >
                      {/* Top Photo / Field Showcase */}
                      <View style={styles.pitchPhotoContainer}>
                        {pitchPhoto ? (
                          <Image source={{ uri: pitchPhoto }} style={styles.pitchImage} resizeMode="cover" />
                        ) : (
                          <View style={styles.pitchPlaceholderField}>
                            <View style={styles.pitchPlaceholderCenter}>
                              <Text style={{ fontSize: 28 }}>{sportEmoji}</Text>
                              <Text style={styles.pitchPlaceholderText}>Photo not uploaded by venue owner yet</Text>
                              <View style={styles.verifiedBadgeInline}>
                                <ShieldCheck size={11} color="#10b981" />
                                <Text style={styles.verifiedBadgeInlineText}>Verified Turf</Text>
                              </View>
                            </View>
                          </View>
                        )}

                        {/* Top Overlays */}
                        <View style={styles.pitchTopOverlay}>
                          <View style={styles.pitchSportBadge}>
                            <Text style={styles.pitchSportBadgeText}>
                              {sportEmoji} {arena.sport}
                            </Text>
                          </View>

                          <View style={styles.pitchPriceBadge}>
                            <Text style={styles.pitchPriceBadgeText}>
                              Pitch: ₹{arena.pricePerSlot || turf.basePrice}
                            </Text>
                          </View>
                        </View>

                        {/* Bottom Overlays */}
                        <View style={styles.pitchBottomOverlay}>
                          {hasRealPhoto ? (
                            <View style={styles.realPhotoTag}>
                              <Text style={styles.realPhotoTagText}>
                                {arena.photos?.[0] ? '📷 Real Pitch Photo' : '📷 Venue Photo'}
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.unuploadedPhotoTag}>
                              <Text style={styles.unuploadedPhotoTagText}>
                                🛡️ Verified Turf • Real Photo Pending
                              </Text>
                            </View>
                          )}
                          {isMaintenance && (
                            <View style={styles.maintenanceBadge}>
                              <Text style={styles.maintenanceBadgeText}>⚠️ In Maintenance</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* Card Body */}
                      <View style={styles.pitchCardBody}>
                        <Text style={styles.pitchCardTitle} numberOfLines={1}>
                          {arena.name}
                        </Text>

                        {/* Feature Badges: Capacity & Surface */}
                        <View style={styles.pitchSpecsRow}>
                          <View style={styles.pitchSpecPill}>
                            <Users size={12} color="#10b981" />
                            <Text style={styles.pitchSpecText}>Up to {arena.capacity || 14} Players</Text>
                          </View>

                          <View style={styles.pitchSpecPill}>
                            <Text style={styles.pitchSpecText}>
                              🌱 {arena.surface || 'FIFA Astroturf'}
                            </Text>
                          </View>
                        </View>

                        {!!arena.description && (
                          <Text style={styles.pitchCardDesc} numberOfLines={2}>
                            {arena.description}
                          </Text>
                        )}

                        {/* Prominent Book Button */}
                        <TouchableOpacity
                          style={[styles.pitchBookBtn, isMaintenance && styles.pitchBookBtnDisabled]}
                          disabled={isMaintenance}
                          onPress={() => navigation.navigate('BookingFlow', { turfId: turf.id, arenaId: arena.id })}
                          activeOpacity={0.85}
                        >
                          <Text style={[styles.pitchBookBtnText, isMaintenance && styles.pitchBookBtnTextDisabled]}>
                            {isMaintenance ? 'Unavailable (Repair)' : 'Book This Pitch'}
                          </Text>
                          {!isMaintenance && <ArrowRight size={14} color="#064e3b" />}
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.pitchShowcaseCardFull}>
                <View style={styles.pitchCardBody}>
                  <Text style={styles.pitchCardTitle}>Main Playing Turf</Text>
                  <Text style={styles.pitchSport}>
                    {turf.sports?.[0] || 'Multi-Sport'} • Base rate ₹{turf.basePrice}/hr
                  </Text>
                  <TouchableOpacity
                    style={styles.pitchBookBtn}
                    onPress={() => navigation.navigate('BookingFlow', { turfId: turf.id })}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.pitchBookBtnText}>Book This Pitch</Text>
                    <ArrowRight size={14} color="#064e3b" />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* Sports Offered */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sports Available</Text>
            <View style={styles.tagsWrap}>
              {turf.sports?.map((sport: string, i: number) => (
                <View key={i} style={styles.sportTag}>
                  <Text style={styles.sportTagText}>{sport}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Hosted Game Lobbies at this Turf / Arena */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Zap size={16} color="#10b981" />
                <Text style={styles.sectionTitle}>Hosted Game Lobbies ({turfLobbies.length})</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Lobbies')}>
                <Text style={styles.seeAllText}>Explore All →</Text>
              </TouchableOpacity>
            </View>

            {turfLobbies.length === 0 ? (
              <View style={styles.emptyLobbyCard}>
                <Text style={styles.emptyLobbyTitle}>No active match lobbies hosted yet</Text>
                <Text style={styles.emptyLobbySub}>
                  Be the first to host a split-pay match lobby on this turf!
                </Text>
                <TouchableOpacity
                  style={styles.createLobbyBtn}
                  onPress={() => navigation.navigate('Lobbies')}
                >
                  <Sparkles size={14} color="#ffffff" />
                  <Text style={styles.createLobbyBtnText}>Host a Game Lobby</Text>
                </TouchableOpacity>
              </View>
            ) : (
              turfLobbies.map((lobby: Lobby) => (
                <View key={lobby.id} style={styles.lobbyItemCard}>
                  <View style={styles.lobbyItemHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lobbyItemName}>{lobby.arenaName ? `${lobby.sport} at ${lobby.arenaName}` : lobby.sport}</Text>
                      <Text style={styles.lobbyItemSub}>
                        {lobby.sport} • {lobby.date} • {lobby.startTime} - {lobby.endTime}
                      </Text>
                    </View>
                    <View style={styles.lobbyPriceBadge}>
                      <Text style={styles.lobbyPriceText}>₹{lobby.pricePerPlayer || 150}/player</Text>
                    </View>
                  </View>
                  <View style={styles.lobbyItemFooter}>
                    <View style={styles.lobbyRosterCount}>
                      <Users size={12} color="#10b981" />
                      <Text style={styles.lobbyRosterText}>
                        {lobby.currentPlayers || 1}/{lobby.maxPlayers || 10} Players
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.joinLobbyBtn}
                      onPress={() => navigation.navigate('Lobbies')}
                    >
                      <Text style={styles.joinLobbyBtnText}>Join Lobby</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Pool of Interested Players for this Sport / Arena */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Users size={16} color="#38bdf8" />
                <Text style={styles.sectionTitle}>Pool of Interested Players ({turfPools.length})</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('Lobbies')}>
                <Text style={styles.seeAllText}>View Pools →</Text>
              </TouchableOpacity>
            </View>

            {turfPools.length === 0 ? (
              <View style={styles.emptyLobbyCard}>
                <Text style={styles.emptyLobbyTitle}>No matchmaking pool active</Text>
                <Text style={styles.emptyLobbySub}>
                  Join or start a player pool to find matching teammates for this ground.
                </Text>
                <TouchableOpacity
                  style={[styles.createLobbyBtn, { backgroundColor: '#0284c7' }]}
                  onPress={() => navigation.navigate('Lobbies')}
                >
                  <UserPlus size={14} color="#ffffff" />
                  <Text style={styles.createLobbyBtnText}>Join Matchmaking Pool</Text>
                </TouchableOpacity>
              </View>
            ) : (
              turfPools.slice(0, 3).map((pool: PlayerPool) => (
                <View key={pool.id} style={styles.poolItemCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.poolSportTitle}>{pool.sport} Matchmaking Pool</Text>
                    <Text style={styles.poolHoursText}>
                      Prefers: {pool.matchHoursCategory} • Max ₹{pool.maxPricePerPlayer}/player
                    </Text>
                    <Text style={styles.poolLocationText}>📍 {pool.area}, {pool.city}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 6 }}>
                    <Text style={styles.poolPlayerCountText}>
                      {pool.currentPlayersCount}/{pool.requiredPlayers} Players
                    </Text>
                    <TouchableOpacity
                      style={styles.joinPoolBtn}
                      onPress={() => navigation.navigate('Lobbies')}
                    >
                      <Text style={styles.joinPoolBtnText}>Join Pool</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Facilities */}
          {turf.facilities && turf.facilities.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amenities & Facilities</Text>
              <View style={styles.amenitiesGrid}>
                {turf.facilities.map((fac: string, i: number) => (
                  <View key={i} style={styles.amenityItem}>
                    <CheckCircle size={14} color="#10b981" />
                    <Text style={styles.amenityText}>{fac}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Reviews Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Player Reviews ({reviews.length})</Text>
            </View>

            {reviews.length === 0 ? (
              <Text style={styles.noReviewsText}>No reviews yet. Be the first to play and review!</Text>
            ) : (
              reviews.slice(0, 3).map((rev: TurfReview) => (
                <View key={rev.id} style={styles.reviewItem}>
                  <View style={styles.reviewHeader}>
                    <Text style={styles.reviewerName}>{rev.playerName}</Text>
                    <View style={styles.starRow}>
                      <Star size={12} color="#f59e0b" fill="#f59e0b" />
                      <Text style={styles.reviewRating}>{rev.rating}</Text>
                    </View>
                  </View>
                  <Text style={styles.reviewComment}>{rev.comment}</Text>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom Booking Bar */}
      <View style={styles.bottomBar}>
        <View>
          <Text style={styles.bottomPriceLabel}>Starting from</Text>
          <Text style={styles.bottomPriceValue}>
            ₹{turf.basePrice}
            <Text style={styles.bottomPerSlot}> / slot</Text>
          </Text>
        </View>

        <TouchableOpacity
          style={styles.bookNowButton}
          onPress={() => navigation.navigate('BookingFlow', { turfId: turf.id })}
        >
          <Calendar size={16} color="#064e3b" />
          <Text style={styles.bookNowText}>Book Slot</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#090d16',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  bannerWrapper: {
    position: 'relative',
    width: '100%',
    height: 220,
  },
  bannerVerifiedBadge: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  bannerVerifiedBadgeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  brandedTurfBannerPlaceholder: {
    width: '100%',
    minHeight: 200,
    backgroundColor: '#071f16',
    padding: 18,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.25)',
  },
  bannerPlaceholderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bannerVerifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  bannerVerifiedPillText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerPlaceholderCenter: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  bannerPlaceholderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#f8fafc',
    textAlign: 'center',
    marginBottom: 4,
  },
  bannerPlaceholderDesc: {
    fontSize: 11,
    color: '#94a3b8',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 16,
  },
  bannerPlaceholderFooter: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    paddingVertical: 6,
    borderRadius: 6,
  },
  bannerPlaceholderFooterText: {
    fontSize: 11,
    color: '#6ee7b7',
    fontWeight: '700',
  },
  bannerImage: {
    width: '100%',
    height: 220,
  },
  content: {
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  titleWrapper: {
    flex: 1,
    marginRight: 10,
  },
  turfName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    marginBottom: 6,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fbbf24',
  },
  actionPillsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  actionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  actionPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 10,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sportTagText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
    marginBottom: 6,
  },
  swipeHintBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  swipeHintText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  pitchCarousel: {
    paddingRight: 16,
    gap: 14,
  },
  pitchShowcaseCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  pitchShowcaseCardCarousel: {
    width: 290,
    marginRight: 12,
  },
  pitchShowcaseCardFull: {
    width: '100%',
    marginBottom: 12,
  },
  pitchCardMaintenance: {
    opacity: 0.85,
    borderColor: '#f59e0b',
  },
  pitchPhotoContainer: {
    width: '100%',
    height: 135,
    backgroundColor: '#0b1120',
    position: 'relative',
  },
  pitchImage: {
    width: '100%',
    height: '100%',
  },
  pitchPlaceholderField: {
    width: '100%',
    height: '100%',
    backgroundColor: '#064e3b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 10,
  },
  pitchPlaceholderCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pitchPlaceholderText: {
    color: '#e2e8f0',
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 3,
  },
  verifiedBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  verifiedBadgeInlineText: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '700',
  },
  pitchTopOverlay: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pitchSportBadge: {
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  pitchSportBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  pitchPriceBadge: {
    backgroundColor: '#10b981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pitchPriceBadgeText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
  pitchBottomOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  realPhotoTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  realPhotoTagText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  unuploadedPhotoTag: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  unuploadedPhotoTagText: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
  },
  maintenanceBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maintenanceBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  pitchCardBody: {
    padding: 14,
  },
  pitchCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
    marginBottom: 8,
  },
  pitchSport: {
    fontSize: 12,
    color: '#94a3b8',
    marginBottom: 10,
  },
  pitchSpecsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  pitchSpecPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  pitchSpecText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  pitchCardDesc: {
    fontSize: 11,
    color: '#94a3b8',
    lineHeight: 16,
    marginBottom: 12,
  },
  pitchBookBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  pitchBookBtnDisabled: {
    backgroundColor: '#1e293b',
  },
  pitchBookBtnText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  pitchBookBtnTextDisabled: {
    color: '#94a3b8',
  },
  seeAllText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyLobbyCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
    textAlign: 'center',
  },
  emptyLobbyTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  emptyLobbySub: {
    color: '#94a3b8',
    fontSize: 11,
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  createLobbyBtn: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  createLobbyBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  lobbyItemCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 10,
  },
  lobbyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  lobbyItemName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  lobbyItemSub: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  lobbyPriceBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lobbyPriceText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  lobbyItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  lobbyRosterCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  lobbyRosterText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  joinLobbyBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  joinLobbyBtnText: {
    color: '#064e3b',
    fontSize: 11,
    fontWeight: '800',
  },
  poolItemCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  poolSportTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  poolHoursText: {
    color: '#38bdf8',
    fontSize: 11,
    marginTop: 2,
    fontWeight: '600',
  },
  poolLocationText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  poolPlayerCountText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '800',
  },
  joinPoolBtn: {
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  joinPoolBtnText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  amenitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  amenityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '45%',
  },
  amenityText: {
    fontSize: 12,
    color: '#cbd5e1',
  },
  noReviewsText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  reviewItem: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  reviewerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reviewRating: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fbbf24',
  },
  reviewComment: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 16,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#131b2e',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 20,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottomPriceLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#10b981',
  },
  bottomPerSlot: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '400',
  },
  bookNowButton: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bookNowText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});
