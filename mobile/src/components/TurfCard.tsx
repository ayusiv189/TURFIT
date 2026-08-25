import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Star, Clock } from 'lucide-react-native';
import { Turf } from '../types';

interface TurfCardProps {
  turf: Turf;
  distance?: string;
  onPress: () => void;
}

export const TurfCard: React.FC<TurfCardProps> = ({ turf, distance, onPress }) => {
  const photo = turf.photos?.[0] || 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80';

  return (
    <TouchableOpacity activeOpacity={0.85} style={styles.card} onPress={onPress}>
      <Image source={{ uri: photo }} style={styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.name} numberOfLines={1}>
            {turf.name}
          </Text>
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
          <View>
            <Text style={styles.priceLabel}>Starting from</Text>
            <Text style={styles.priceText}>
              ₹{turf.basePrice}
              <Text style={styles.perHour}> / slot</Text>
            </Text>
          </View>
          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book Slot</Text>
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
  image: {
    width: '100%',
    height: 140,
    backgroundColor: '#0b1120',
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
});
