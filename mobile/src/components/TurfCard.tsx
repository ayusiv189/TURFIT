import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Star, ShieldCheck, Camera, Tag, Sparkles } from 'lucide-react-native';
import { Turf, Offer } from '../types';

interface TurfCardProps {
  turf: Turf;
  offer?: Offer;
  offers?: Offer[];
  distance?: string;
  onPress: () => void;
}

const getSportEmoji = (sport?: string) => {
  const s = (sport || '').toLowerCase();
  if (s.includes('cricket')) return '🏏';
  if (s.includes('football') || s.includes('soccer')) return '⚽';
  if (s.includes('badminton')) return '🏸';
  if (s.includes('pickleball')) return '🏓';
  if (s.includes('tennis')) return '🎾';
  if (s.includes('basketball')) return '🏀';
  return '🏆';
};

export const TurfCard: React.FC<TurfCardProps> = ({ turf, offer, offers, distance, onPress }) => {
  const hasOwnerPhoto = Boolean(turf.photos && turf.photos.length > 0 && turf.photos[0]);
  const photo = hasOwnerPhoto ? turf.photos![0] : null;
  const isFeatured = Boolean(turf.isFeatured);

  // Resolve all offers to display
  const displayOffers = offers && offers.length > 0 ? offers : (offer ? [offer] : []);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[styles.card, isFeatured && styles.featuredCard]}
      onPress={onPress}
    >
      {/* Featured / Sponsored Top Rail */}
      {isFeatured && (
        <View style={styles.featuredTopRail}>
          <View style={styles.featuredBadge}>
            <Sparkles size={11} color="#000000" />
            <Text style={styles.featuredBadgeText}>⭐ SPONSORED • TOP RANKED</Text>
          </View>
          <Text style={styles.featuredSubtitle}>Verified Partner Venue</Text>
        </View>
      )}

      {hasOwnerPhoto ? (
        <View style={styles.imageWrapper}>
          <Image source={{ uri: photo! }} style={styles.image} resizeMode="cover" />
          <View style={styles.verifiedPhotoBadge}>
            <Camera size={11} color="#38bdf8" />
            <Text style={styles.verifiedPhotoText}>
              {turf.photos!.length > 1 ? `Real Photos (${turf.photos!.length})` : 'Real Photo'}
            </Text>
          </View>
        </View>
      ) : (
        <View style={styles.placeholderBanner}>
          <View style={styles.placeholderTopRow}>
            <View style={styles.verifiedPill}>
              <ShieldCheck size={13} color="#10b981" />
              <Text style={styles.verifiedPillText}>Verified Turf</Text>
            </View>
            <Text style={styles.placeholderSportEmoji}>
              {getSportEmoji(turf.sports?.[0])}
            </Text>
          </View>

          <View style={styles.placeholderBottomInfo}>
            <Text style={styles.placeholderMainText}>
              Photo not uploaded by venue owner yet
            </Text>
            <Text style={styles.placeholderSubText}>
              Verified facility in {turf.area || turf.city} • No stock filler
            </Text>
          </View>
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, marginRight: 8 }}>
            <Text style={styles.name} numberOfLines={1}>
              {turf.name}
            </Text>
            {isFeatured && (
              <View style={styles.featuredMiniChip}>
                <Text style={styles.featuredMiniChipText}>FEATURED</Text>
              </View>
            )}
          </View>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#f59e0b" fill="#f59e0b" />
            <Text style={styles.ratingText}>4.8</Text>
          </View>
        </View>

        <View style={styles.locationRow}>
          <MapPin size={13} color="#94a3b8" />
          <Text style={styles.locationText} numberOfLines={1}>
            {turf.area}, {turf.city} {distance ? `• ${distance}` : ''}
          </Text>
        </View>

        <View style={styles.tagsRow}>
          {turf.sports?.slice(0, 3).map((sport, index) => (
            <View key={index} style={styles.sportBadge}>
              <Text style={styles.sportText}>{sport}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footerRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
            <View>
              <Text style={styles.priceLabel}>Starting from</Text>
              <Text style={styles.priceText}>
                ₹{turf.basePrice}
                <Text style={styles.perHour}> / slot</Text>
              </Text>
            </View>
            {displayOffers.map((off, index) => (
              <View key={index} style={{
                backgroundColor: '#db2777', // pink
                paddingHorizontal: 7,
                paddingVertical: 3,
                borderRadius: 6,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 2,
                alignSelf: 'flex-end',
                marginBottom: 2
              }}>
                <Tag size={9} color="#ffffff" />
                <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>
                  {off.discountType === 'PERCENTAGE' ? `${off.discountValue}% OFF` : `₹${off.discountValue} OFF`}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.bookButton, isFeatured && styles.featuredBookButton]}>
            <Text style={[styles.bookButtonText, isFeatured && styles.featuredBookButtonText]}>Book Slot</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 140,
  },
  image: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0b1120',
  },
  verifiedPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  verifiedPhotoText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  placeholderBanner: {
    width: '100%',
    height: 140,
    backgroundColor: '#081e17',
    padding: 12,
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(16, 185, 129, 0.2)',
  },
  placeholderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  verifiedPillText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderSportEmoji: {
    fontSize: 22,
  },
  placeholderBottomInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  placeholderMainText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '700',
  },
  placeholderSubText: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
  content: {
    padding: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
    marginRight: 8,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fbbf24',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: '#94a3b8',
    flex: 1,
  },
  tagsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  sportBadge: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sportText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '600',
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  priceLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  priceText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  perHour: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '400',
  },
  bookButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  bookButtonText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '700',
  },
  featuredCard: {
    borderColor: '#f59e0b',
    borderWidth: 1.5,
    backgroundColor: '#141d33',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  featuredTopRail: {
    backgroundColor: '#1e1b4b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  featuredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f59e0b',
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 6,
  },
  featuredBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  featuredSubtitle: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '600',
  },
  featuredMiniChip: {
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderWidth: 1,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  featuredMiniChipText: {
    color: '#fbbf24',
    fontSize: 8,
    fontWeight: '900',
  },
  featuredBookButton: {
    backgroundColor: '#f59e0b',
  },
  featuredBookButtonText: {
    color: '#000000',
    fontWeight: '900',
  },
});
