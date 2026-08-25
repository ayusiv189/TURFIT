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
import { getTurfReviews } from '../../services/communityService';
import { Turf, Arena, TurfReview } from '../../types';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [turfData, arenaData, reviewData] = await Promise.all([
          getTurfById(turfId),
          getArenasByTurf(turfId),
          getTurfReviews(turfId),
        ]);
        setTurf(turfData);
        setArenas(arenaData);
        setReviews(reviewData);
      } catch (err) {
        console.warn('Error loading turf details:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [turfId]);

  const handleOpenDirections = () => {
    if (!turf) return;
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

  const mainPhoto =
    turf.photos?.[0] ||
    'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Banner Image */}
        <Image source={{ uri: mainPhoto }} style={styles.bannerImage} resizeMode="cover" />

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

          {/* Arenas / Pitches */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Grounds & Arenas ({arenas.length})</Text>
            {arenas.map((arena: Arena) => (
              <View key={arena.id} style={styles.arenaCard}>
                <View>
                  <Text style={styles.arenaName}>{arena.name}</Text>
                  <Text style={styles.arenaSport}>{arena.sport} • Up to {arena.capacity || 14} players</Text>
                </View>
                <Text style={styles.arenaPrice}>₹{arena.pricePerSlot || turf.basePrice}/hr</Text>
              </View>
            ))}
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
  arenaCard: {
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 8,
  },
  arenaName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  arenaSport: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  arenaPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
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
