import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { PromotionalBanner, BannerAudience } from '../types';
import { listenActivePromotionalBanners } from '../services/dbService';
import { Sparkles, ArrowRight, Flame } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface PromotionalBannerCarouselProps {
  audience?: BannerAudience;
  navigation?: any;
  onPressBanner?: (banner: PromotionalBanner) => void;
}

export const PromotionalBannerCarousel: React.FC<PromotionalBannerCarouselProps> = ({
  audience = 'PLAYERS',
  navigation,
  onPressBanner,
}) => {
  const [banners, setBanners] = useState<PromotionalBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const unsubscribe = listenActivePromotionalBanners(audience, (data) => {
      setBanners(data);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [audience]);

  // Auto-slide effect
  useEffect(() => {
    if (banners.length <= 1) return;

    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
    }

    autoScrollTimer.current = setInterval(() => {
      setActiveIndex((prev) => {
        const nextIndex = (prev + 1) % banners.length;
        scrollViewRef.current?.scrollTo({
          x: nextIndex * (CARD_WIDTH + 12),
          animated: true,
        });
        return nextIndex;
      });
    }, 5500);

    return () => {
      if (autoScrollTimer.current) {
        clearInterval(autoScrollTimer.current);
      }
    };
  }, [banners.length]);

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const currentIndex = Math.round(contentOffsetX / (CARD_WIDTH + 12));
    if (currentIndex >= 0 && currentIndex < banners.length && currentIndex !== activeIndex) {
      setActiveIndex(currentIndex);
    }
  };

  const handleNavigate = (targetScreen: string, banner: PromotionalBanner) => {
    if (onPressBanner) {
      onPressBanner(banner);
      return;
    }

    if (!navigation) return;

    const screenKey = (targetScreen || '').toUpperCase();
    if (screenKey.includes('EXPLORE') || screenKey.includes('TURF')) {
      navigation.navigate('ExploreTurfs');
    } else if (screenKey.includes('LOBB') || screenKey.includes('MATCH')) {
      navigation.navigate('Lobbies');
    } else if (screenKey.includes('GAMING') || screenKey.includes('GAME')) {
      navigation.navigate('GamingZone');
    } else if (screenKey.includes('BOOKING')) {
      navigation.navigate('PlayerBookings');
    } else if (screenKey.includes('TEAM')) {
      navigation.navigate('Teams');
    } else if (screenKey.includes('PROFILE')) {
      navigation.navigate('PlayerProfile');
    } else {
      // Default fallback navigation
      try {
        navigation.navigate(targetScreen);
      } catch (e) {
        navigation.navigate('ExploreTurfs');
      }
    }
  };

  if (!banners || banners.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled={false}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + 12}
        snapToAlignment="start"
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        contentContainerStyle={styles.scrollContent}
      >
        {banners.map((banner, index) => {
          return (
            <TouchableOpacity
              key={banner.id || index}
              activeOpacity={0.92}
              style={[styles.bannerCard, { width: CARD_WIDTH }]}
              onPress={() => handleNavigate(banner.targetScreen, banner)}
            >
              <Image source={{ uri: banner.imageUrl }} style={styles.bannerImage} resizeMode="cover" />
              <View style={styles.overlay} />

              <View style={styles.bannerContent}>
                <View style={styles.topBadgeRow}>
                  <View style={styles.campaignBadge}>
                    <Sparkles size={11} color="#fbbf24" />
                    <Text style={styles.campaignBadgeText}>FEATURED CAMPAIGN</Text>
                  </View>
                  <View style={styles.counterBadge}>
                    <Text style={styles.counterBadgeText}>
                      {index + 1} / {banners.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.textContainer}>
                  <Text style={styles.title} numberOfLines={2}>
                    {banner.title}
                  </Text>
                  <Text style={styles.subtitle} numberOfLines={2}>
                    {banner.subtitle}
                  </Text>
                </View>

                {banner.buttonText ? (
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.8}
                    onPress={() => handleNavigate(banner.targetScreen, banner)}
                  >
                    <Text style={styles.actionButtonText}>{banner.buttonText}</Text>
                    <ArrowRight size={13} color="#ffffff" />
                  </TouchableOpacity>
                ) : (
                  <View style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Explore Now</Text>
                    <ArrowRight size={13} color="#ffffff" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Indicator Dots */}
      {banners.length > 1 && (
        <View style={styles.paginationDots}>
          {banners.map((_, dotIdx) => (
            <TouchableOpacity
              key={dotIdx}
              onPress={() => {
                setActiveIndex(dotIdx);
                scrollViewRef.current?.scrollTo({
                  x: dotIdx * (CARD_WIDTH + 12),
                  animated: true,
                });
              }}
              style={[
                styles.dot,
                dotIdx === activeIndex ? styles.activeDot : styles.inactiveDot,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  scrollContent: {
    paddingHorizontal: 0,
    gap: 12,
  },
  bannerCard: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#131b2e',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.3)',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(9, 13, 22, 0.72)',
  },
  bannerContent: {
    flex: 1,
    padding: 16,
    justifyContent: 'space-between',
  },
  topBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  campaignBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
  },
  campaignBadgeText: {
    color: '#fbbf24',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  counterBadge: {
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  counterBadgeText: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  textContainer: {
    marginVertical: 4,
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 11,
    lineHeight: 15,
  },
  actionButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#4f46e5',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '800',
  },
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 20,
    backgroundColor: '#6366f1',
  },
  inactiveDot: {
    width: 6,
    backgroundColor: '#334155',
  },
});
