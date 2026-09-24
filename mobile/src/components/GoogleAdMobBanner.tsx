import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Linking,
} from 'react-native';
import { Info, X, ExternalLink, Sparkles, Shield } from 'lucide-react-native';

export type AdMobFormat = 'BANNER' | 'MEDIUM_RECTANGLE' | 'POST_BOOKING_SPONSOR' | 'INLINE_FEED';

interface GoogleAdMobBannerProps {
  format?: AdMobFormat;
  adUnitId?: string;
  placement?: string;
  onDismiss?: () => void;
}

interface SponsoredCreative {
  title: string;
  tagline: string;
  ctaText: string;
  badge: string;
  imageUrl: string;
  sponsorName: string;
  landingUrl: string;
  promoCode?: string;
}

const SPONSORED_CREATIVES: SponsoredCreative[] = [
  {
    title: 'HydraMax Electrolyte Sports Fuel ⚡',
    tagline: 'Zero sugar isotonic hydration for peak stamina on the pitch. Drink before match kickoff.',
    ctaText: 'Get 25% Off',
    badge: 'SPORTS NUTRITION',
    imageUrl: 'https://images.unsplash.com/photo-1550572017-edd951aa8f72?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'HydraMax Athletics',
    landingUrl: 'https://google.com',
    promoCode: 'TURFPASS25',
  },
  {
    title: 'Pro-Grip Turf Cleats & Studs 👟',
    tagline: 'High traction rubber studs engineered for artificial grass and indoor 5v5 arenas.',
    ctaText: 'Shop Gear',
    badge: 'ATHLETIC GEAR',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'ProGrip Sports',
    landingUrl: 'https://google.com',
    promoCode: 'PLAYMATCH',
  },
  {
    title: 'Match-Day High Protein Bars 🍫',
    tagline: '20g Whey Protein + BCAA fuel to recover faster after grueling 60-minute matches.',
    ctaText: 'Claim Pack',
    badge: 'RECOVERY FUEL',
    imageUrl: 'https://images.unsplash.com/photo-1622484216805-4e7cb82d7c04?auto=format&fit=crop&w=600&q=80',
    sponsorName: 'FuelBar India',
    landingUrl: 'https://google.com',
    promoCode: 'MATCHFUEL',
  },
];

export const GoogleAdMobBanner: React.FC<GoogleAdMobBannerProps> = ({
  format = 'BANNER',
  adUnitId = 'ca-app-pub-3940256099942544/6300978111',
  placement = 'PlayerFeed',
  onDismiss,
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [creativeIndex] = useState(() => Math.floor(Math.random() * SPONSORED_CREATIVES.length));

  if (isDismissed) return null;

  const creative = SPONSORED_CREATIVES[creativeIndex];

  const handleOpenAd = () => {
    // Open partner promotion
    setShowInfoModal(true);
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    if (onDismiss) onDismiss();
  };

  // 1. Post-Booking Sponsor Offer Card (Rich rewarded style)
  if (format === 'POST_BOOKING_SPONSOR') {
    return (
      <View style={styles.postBookingContainer}>
        {/* Info Modal */}
        <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.infoModalCard}>
              <View style={styles.infoModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Shield size={16} color="#38bdf8" />
                  <Text style={styles.infoModalTitle}>Google AdMob Verified Partner</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.infoModalBody}>
                You are viewing a personalized sports & fitness partner recommendation.
              </Text>
              <View style={styles.adSlotIdBox}>
                <Text style={styles.adSlotIdLabel}>AdMob Unit ID:</Text>
                <Text style={styles.adSlotIdText}>{adUnitId}</Text>
                <Text style={styles.adSlotPlacement}>Placement: {placement}</Text>
              </View>
              <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setShowInfoModal(false)}>
                <Text style={styles.infoModalCloseBtnText}>Close Notice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.postBookingHeader}>
          <View style={styles.adBadgeRow}>
            <View style={styles.googleAdBadge}>
              <Text style={styles.googleAdBadgeText}>Ad</Text>
            </View>
            <Text style={styles.sponsoredByText}>Partner Reward for Booking</Text>
          </View>
          <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoButton}>
            <Info size={12} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <View style={styles.postBookingCardBody}>
          <Image source={{ uri: creative.imageUrl }} style={styles.postBookingImage} resizeMode="cover" />
          <View style={styles.postBookingDetails}>
            <View style={styles.tagBadge}>
              <Sparkles size={10} color="#38bdf8" />
              <Text style={styles.tagBadgeText}>{creative.badge}</Text>
            </View>
            <Text style={styles.postBookingTitle}>{creative.title}</Text>
            <Text style={styles.postBookingTagline}>{creative.tagline}</Text>
            
            {creative.promoCode && (
              <View style={styles.promoCodeBox}>
                <Text style={styles.promoCodeLabel}>Use Coupon at checkout:</Text>
                <Text style={styles.promoCodeValue}>{creative.promoCode}</Text>
              </View>
            )}

            <TouchableOpacity style={styles.postBookingCta} onPress={handleOpenAd} activeOpacity={0.85}>
              <Text style={styles.postBookingCtaText}>{creative.ctaText}</Text>
              <ExternalLink size={12} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // 2. Medium Rectangle Native Feed Card (300x250)
  if (format === 'MEDIUM_RECTANGLE' || format === 'INLINE_FEED') {
    return (
      <View style={styles.feedCardContainer}>
        {/* Info Modal */}
        <Modal visible={showInfoModal} transparent animationType="fade" onRequestClose={() => setShowInfoModal(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.infoModalCard}>
              <View style={styles.infoModalHeader}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Shield size={16} color="#38bdf8" />
                  <Text style={styles.infoModalTitle}>Google AdMob Sponsored Placement</Text>
                </View>
                <TouchableOpacity onPress={() => setShowInfoModal(false)}>
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
              <Text style={styles.infoModalBody}>
                This native ad slot is rendered via Google AdMob SDK placeholder.
              </Text>
              <View style={styles.adSlotIdBox}>
                <Text style={styles.adSlotIdLabel}>AdMob Unit ID:</Text>
                <Text style={styles.adSlotIdText}>{adUnitId}</Text>
                <Text style={styles.adSlotPlacement}>Placement: {placement}</Text>
              </View>
              <TouchableOpacity style={styles.infoModalCloseBtn} onPress={() => setShowInfoModal(false)}>
                <Text style={styles.infoModalCloseBtnText}>Close Notice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.feedCardHeader}>
          <View style={styles.adBadgeRow}>
            <View style={styles.googleAdBadge}>
              <Text style={styles.googleAdBadgeText}>Ad</Text>
            </View>
            <Text style={styles.sponsoredByText}>Sponsored • {creative.sponsorName}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.infoButton}>
              <Info size={12} color="#94a3b8" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDismiss} style={styles.infoButton}>
              <X size={12} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.feedCardBody}>
          <Image source={{ uri: creative.imageUrl }} style={styles.feedCardImage} resizeMode="cover" />
          <View style={styles.feedCardContent}>
            <Text style={styles.feedCardTitle}>{creative.title}</Text>
            <Text style={styles.feedCardTagline} numberOfLines={2}>{creative.tagline}</Text>
            <View style={styles.feedCardFooter}>
              <Text style={styles.feedCardAdSenseTag}>Google AdMob Network</Text>
              <TouchableOpacity style={styles.feedCardCta} onPress={handleOpenAd} activeOpacity={0.85}>
                <Text style={styles.feedCardCtaText}>{creative.ctaText}</Text>
                <ExternalLink size={11} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  }

  // 3. Standard Banner (320x50 / Compact strip)
  return (
    <View style={styles.standardBannerContainer}>
      <View style={styles.standardBannerInner}>
        <View style={styles.standardBannerLeft}>
          <View style={styles.googleAdBadgeSmall}>
            <Text style={styles.googleAdBadgeTextSmall}>Ad</Text>
          </View>
          <Image source={{ uri: creative.imageUrl }} style={styles.standardBannerThumb} />
          <View style={styles.standardBannerTextWrap}>
            <Text style={styles.standardBannerTitle} numberOfLines={1}>{creative.title}</Text>
            <Text style={styles.standardBannerSponsor} numberOfLines={1}>{creative.sponsorName} • {creative.ctaText}</Text>
          </View>
        </View>

        <View style={styles.standardBannerRight}>
          <TouchableOpacity style={styles.standardBannerCtaBtn} onPress={handleOpenAd}>
            <Text style={styles.standardBannerCtaText}>Visit</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowInfoModal(true)} style={styles.standardBannerInfoBtn}>
            <Info size={11} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Standard Banner 320x50
  standardBannerContainer: {
    marginVertical: 10,
    borderRadius: 12,
    backgroundColor: '#0d1322',
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  standardBannerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  standardBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginRight: 8,
  },
  googleAdBadgeSmall: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 4,
    paddingVertical: 1.5,
    borderRadius: 3,
  },
  googleAdBadgeTextSmall: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  standardBannerThumb: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#1e293b',
  },
  standardBannerTextWrap: {
    flex: 1,
  },
  standardBannerTitle: {
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: '700',
  },
  standardBannerSponsor: {
    color: '#94a3b8',
    fontSize: 10,
  },
  standardBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  standardBannerCtaBtn: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  standardBannerCtaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  standardBannerInfoBtn: {
    padding: 3,
  },

  // Feed Card
  feedCardContainer: {
    marginVertical: 12,
    backgroundColor: '#111827',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  feedCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  adBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  googleAdBadge: {
    backgroundColor: '#eab308',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  googleAdBadgeText: {
    color: '#000000',
    fontSize: 9,
    fontWeight: '900',
  },
  sponsoredByText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  infoButton: {
    padding: 3,
  },
  feedCardBody: {
    flexDirection: 'row',
    padding: 12,
    gap: 12,
    alignItems: 'center',
  },
  feedCardImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: '#1e293b',
  },
  feedCardContent: {
    flex: 1,
  },
  feedCardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  feedCardTagline: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
    marginBottom: 8,
  },
  feedCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedCardAdSenseTag: {
    color: '#64748b',
    fontSize: 9,
    fontFamily: 'monospace',
  },
  feedCardCta: {
    backgroundColor: '#2563eb',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  feedCardCtaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Post Booking
  postBookingContainer: {
    marginVertical: 14,
    backgroundColor: '#0c1222',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    padding: 14,
  },
  postBookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  postBookingCardBody: {
    flexDirection: 'row',
    gap: 12,
  },
  postBookingImage: {
    width: 85,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#1e293b',
  },
  postBookingDetails: {
    flex: 1,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  tagBadgeText: {
    color: '#38bdf8',
    fontSize: 9,
    fontWeight: '800',
  },
  postBookingTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  postBookingTagline: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  promoCodeBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 6,
  },
  promoCodeLabel: {
    color: '#fbbf24',
    fontSize: 9,
  },
  promoCodeValue: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  postBookingCta: {
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  postBookingCtaText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  infoModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  infoModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoModalTitle: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
  infoModalBody: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  adSlotIdBox: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
  },
  adSlotIdLabel: {
    color: '#64748b',
    fontSize: 10,
  },
  adSlotIdText: {
    color: '#38bdf8',
    fontSize: 11,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  adSlotPlacement: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 4,
  },
  infoModalCloseBtn: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  infoModalCloseBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
});
