import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { MapPin, Users, Building2, ShieldCheck, Camera, ArrowRight } from 'lucide-react-native';

export interface PitchCardData {
  id: string;
  arenaId: string;
  name: string;
  sport: string;
  turfId: string;
  turfName: string;
  turfArea?: string;
  turfCity?: string;
  distance?: string;
  capacity?: number;
  surface?: string;
  description?: string;
  pricePerSlot: number;
  photos?: string[];
  isUnderMaintenance?: boolean;
  supportedSports?: string[];
  isMultiSport?: boolean;
}

interface PitchCardProps {
  pitch: PitchCardData;
  onBookPitch: () => void;
  onViewTurf: () => void;
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

export const PitchCard: React.FC<PitchCardProps> = ({ pitch, onBookPitch, onViewTurf }) => {
  const hasPhoto = Boolean(pitch.photos && pitch.photos.length > 0 && pitch.photos[0]);
  const photoUri = hasPhoto ? pitch.photos![0] : null;
  const isMaintenance = Boolean(pitch.isUnderMaintenance);
  const sportEmoji = getSportEmoji(pitch.sport);

  return (
    <View style={styles.card}>
      {/* Top Banner or Transparent Branded Placeholder */}
      <TouchableOpacity activeOpacity={0.9} onPress={onViewTurf}>
        {hasPhoto ? (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: photoUri! }} style={styles.image} resizeMode="cover" />
            <View style={styles.verifiedPhotoBadge}>
              <Camera size={11} color="#38bdf8" />
              <Text style={styles.verifiedPhotoText}>Real Pitch Photo</Text>
            </View>
          </View>
        ) : (
          <View style={styles.placeholderBanner}>
            <View style={styles.placeholderTopRow}>
              <View style={styles.verifiedPill}>
                <ShieldCheck size={12} color="#10b981" />
                <Text style={styles.verifiedPillText}>Verified Pitch</Text>
              </View>
              <Text style={{ fontSize: 22 }}>{sportEmoji}</Text>
            </View>

            <View style={styles.placeholderCenter}>
              <Text style={styles.placeholderTitle}>Photo not uploaded by venue owner yet</Text>
              <Text style={styles.placeholderSub}>
                Verified dimensions & lighting • Certified {pitch.sport} court
              </Text>
            </View>
          </View>
        )}

        {/* Top Floating Badges */}
        <View style={styles.topOverlayRow}>
          <View style={styles.sportTag}>
            <Text style={styles.sportTagText}>
              {sportEmoji} {pitch.sport}
            </Text>
          </View>

          {pitch.isMultiSport && (
            <View style={styles.multiSportOverlayTag}>
              <Text style={styles.multiSportOverlayTagText}>⚡ Shared Ground</Text>
            </View>
          )}

          {isMaintenance && (
            <View style={styles.maintenanceTag}>
              <Text style={styles.maintenanceTagText}>⚠️ Under Maintenance</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>

      {/* Card Details */}
      <View style={styles.body}>
        {/* Pitch Name */}
        <TouchableOpacity activeOpacity={0.8} onPress={onViewTurf}>
          <Text style={styles.pitchName} numberOfLines={1}>
            {pitch.name}
          </Text>
        </TouchableOpacity>

        {pitch.isMultiSport && pitch.supportedSports && pitch.supportedSports.length > 1 && (
          <View style={styles.multiSportNoticePill}>
            <Text style={styles.multiSportNoticePillText}>
              ⚡ Multi-Sport: {pitch.supportedSports.map(s => `${getSportEmoji(s)} ${s}`).join(' • ')}
            </Text>
          </View>
        )}

        {/* Parent Venue & Location */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={onViewTurf}
          style={styles.facilityRow}
        >
          <Building2 size={13} color="#38bdf8" />
          <Text style={styles.facilityName} numberOfLines={1}>
            {pitch.turfName}
          </Text>
          <Text style={styles.facilityDivider}>•</Text>
          <MapPin size={12} color="#94a3b8" />
          <Text style={styles.facilityLocation} numberOfLines={1}>
            {pitch.turfArea || pitch.turfCity}
            {pitch.distance ? ` • ${pitch.distance}` : ''}
          </Text>
        </TouchableOpacity>

        {/* Specs: Capacity & Surface */}
        <View style={styles.specsRow}>
          <View style={styles.specBadge}>
            <Users size={12} color="#10b981" />
            <Text style={styles.specBadgeText}>Up to {pitch.capacity || (pitch.sport.toLowerCase().includes('badminton') ? 4 : 14)} Players</Text>
          </View>

          <View style={styles.specBadge}>
            <Text style={styles.specBadgeText}>
              {pitch.surface || (pitch.sport.toLowerCase().includes('badminton') ? '🏸 Indoor Synthetic' : '🌱 FIFA AstroTurf')}
            </Text>
          </View>
        </View>

        {!!pitch.description && (
          <Text style={styles.description} numberOfLines={2}>
            {pitch.description}
          </Text>
        )}

        {/* Footer: Pricing & Action Buttons */}
        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Pitch Price</Text>
            <Text style={styles.priceValue}>
              ₹{pitch.pricePerSlot}
            </Text>
          </View>

          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={styles.venueDetailsBtn}
              onPress={onViewTurf}
              activeOpacity={0.8}
            >
              <Text style={styles.venueDetailsBtnText}>Venue Info</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bookPitchBtn, isMaintenance && styles.bookPitchBtnDisabled]}
              disabled={isMaintenance}
              onPress={onBookPitch}
              activeOpacity={0.85}
            >
              <Text style={[styles.bookPitchBtnText, isMaintenance && styles.bookPitchBtnTextDisabled]}>
                {isMaintenance ? 'Unavailable' : 'Book Pitch'}
              </Text>
              {!isMaintenance && <ArrowRight size={13} color="#064e3b" />}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
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
    backgroundColor: '#0b1120',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  verifiedPhotoBadge: {
    position: 'absolute',
    bottom: 8,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(9, 13, 22, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
  },
  verifiedPhotoText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  placeholderBanner: {
    width: '100%',
    height: 130,
    backgroundColor: '#071f16',
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
    paddingVertical: 3,
    borderRadius: 6,
  },
  verifiedPillText: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '800',
  },
  placeholderCenter: {
    alignItems: 'center',
    paddingBottom: 4,
  },
  placeholderTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 2,
  },
  placeholderSub: {
    color: '#94a3b8',
    fontSize: 10,
    textAlign: 'center',
  },
  topOverlayRow: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sportTag: {
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  sportTagText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  multiSportOverlayTag: {
    backgroundColor: 'rgba(56, 189, 248, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  multiSportOverlayTagText: {
    color: '#082f49',
    fontSize: 10,
    fontWeight: '800',
  },
  maintenanceTag: {
    backgroundColor: 'rgba(245, 158, 11, 0.95)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  maintenanceTagText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  body: {
    padding: 14,
  },
  pitchName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 4,
  },
  multiSportNoticePill: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  multiSportNoticePillText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  facilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 10,
  },
  facilityName: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
    maxWidth: 130,
  },
  facilityDivider: {
    color: '#475569',
    fontSize: 12,
  },
  facilityLocation: {
    color: '#94a3b8',
    fontSize: 12,
    flex: 1,
  },
  specsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  specBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  specBadgeText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  description: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 4,
  },
  priceContainer: {
    justifyContent: 'center',
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600',
  },
  priceValue: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
  },
  priceUnit: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '400',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  venueDetailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
  venueDetailsBtnText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  bookPitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#10b981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  bookPitchBtnDisabled: {
    backgroundColor: '#475569',
  },
  bookPitchBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },
  bookPitchBtnTextDisabled: {
    color: '#94a3b8',
  },
});
