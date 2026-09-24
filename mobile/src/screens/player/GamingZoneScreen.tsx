import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  RefreshControl,
  FlatList,
} from 'react-native';
import { getTurfs, getAllArenas } from '../../services/dbService';
import { Turf, Arena } from '../../types';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import {
  Search,
  MapPin,
  Clock,
  Sparkles,
  Zap,
  Users,
  ChevronRight,
  CheckCircle2,
  Tv,
  Gamepad2,
  Wind,
  Coffee,
  Armchair,
  ShieldCheck,
  X,
  RotateCcw,
  ArrowLeft,
  PlusCircle,
  Building,
  Camera,
} from 'lucide-react-native';

const GAME_CATEGORIES = [
  { id: 'ALL', label: 'All Games', icon: '⚡' },
  { id: 'Pool', label: 'Snooker & Pool', icon: '🎱' },
  { id: 'Table Tennis', label: 'Table Tennis', icon: '🏓' },
  { id: 'Carrom', label: 'Carrom & Boards', icon: '🎯' },
  { id: 'Foosball', label: 'Foosball & Arcade', icon: '⚽' },
  { id: 'Console PS5', label: 'Console Lounge', icon: '🎮' },
];

export interface GamingStation {
  id: string;
  turfId: string;
  turfName: string;
  area: string;
  city: string;
  rating: number;
  gameType: string;
  category: string;
  title: string;
  specification: string;
  photoUrl: string;
  photos: string[];
  hourlyPrice: number;
  minDuration: number;
  equipmentChecklist: string[];
  amenities: string[];
  distanceKm?: number;
  availableSlotsCount: number;
}

export const GamingZoneScreen: React.FC<{ navigation: any; route?: any }> = ({
  navigation,
  route,
}) => {
  const { user, profile, role } = useAuth();
  const { userLocation, calculateDistanceKm } = useLocation();
  const [selectedCategory, setSelectedCategory] = useState<string>(
    route?.params?.category || 'ALL'
  );
  const [selectedStation, setSelectedStation] = useState<GamingStation | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      const [turfList, arenaList] = await Promise.all([
        getTurfs(),
        getAllArenas(),
      ]);
      setTurfs(turfList);
      setArenas(arenaList);
    } catch (err) {
      console.warn('Error loading gaming zone data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Compile full gaming station list ONLY from registered real DB indoor arenas
  // NO demo or test data - strictly real venues from Firestore
  const gamingStations = useMemo<GamingStation[]>(() => {
    const list: GamingStation[] = [];

    arenas.forEach((arena) => {
      const parentTurf = turfs.find((t) => t.id === arena.turfId);
      const isIndoor =
        arena.facilityType === 'INDOOR_GAME' ||
        ['pool', 'snooker', 'table tennis', 'carrom', 'foosball', 'ps5', 'console', 'billiards', 'arcade', 'board', 'air hockey', 'vr', 'darts'].some(
          (k) =>
            arena.indoorGameType?.toLowerCase().includes(k) ||
            arena.sport?.toLowerCase().includes(k) ||
            arena.name?.toLowerCase().includes(k)
        );

      if (isIndoor && parentTurf) {
        let category = 'Pool';
        const sLower = (arena.indoorGameType || arena.sport || arena.name).toLowerCase();
        if (sLower.includes('tennis') || sLower.includes('tt')) category = 'Table Tennis';
        else if (sLower.includes('carrom') || sLower.includes('board')) category = 'Carrom';
        else if (sLower.includes('foosball') || sLower.includes('arcade')) category = 'Foosball';
        else if (sLower.includes('ps5') || sLower.includes('console') || sLower.includes('gamepad'))
          category = 'Console PS5';
        else if (arena.indoorGameType && arena.indoorGameType.trim())
          category = arena.indoorGameType.trim();
        else if (arena.sport && arena.sport.trim())
          category = arena.sport.trim();

        const dist =
          userLocation && parentTurf.latitude && parentTurf.longitude
            ? calculateDistanceKm(
                userLocation.latitude,
                userLocation.longitude,
                parentTurf.latitude,
                parentTurf.longitude
              )
            : undefined;

        const stationPhotos =
          arena.photos && arena.photos.length > 0
            ? arena.photos
            : parentTurf.photos && parentTurf.photos.length > 0
            ? parentTurf.photos
            : ['https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80'];

        list.push({
          id: arena.id,
          turfId: parentTurf.id,
          turfName: parentTurf.name,
          area: parentTurf.area || 'Sports District',
          city: parentTurf.city || 'City',
          rating: 4.8,
          gameType: arena.indoorGameType || arena.sport || 'Indoor Gaming',
          category,
          title: arena.name,
          specification:
            arena.description || `${arena.capacity || 4} Players Capacity • Dedicated indoor setup`,
          photoUrl: stationPhotos[0],
          photos: stationPhotos,
          hourlyPrice: arena.pricePerSlot || parentTurf.basePrice || 200,
          minDuration: arena.slotDurationOption || 60,
          equipmentChecklist:
            arena.equipmentIncluded && arena.equipmentIncluded.length > 0
              ? arena.equipmentIncluded
              : ['Standard Equipment Provided', 'Sanitized Gear Included'],
          amenities: [
            arena.hasAirConditioning ? 'Air Conditioned ❄️' : 'Ventilated',
            arena.hasLoungeAccess ? 'Sofa Lounge 🛋️' : 'Waiting Area',
            'Refreshments Available',
          ],
          distanceKm: dist,
          availableSlotsCount: 8,
        });
      }
    });

    return list;
  }, [arenas, turfs, userLocation, calculateDistanceKm]);

  // Dynamically compute category chips including any custom unlisted games added by owners
  const dynamicCategories = useMemo(() => {
    const base = [
      { id: 'ALL', label: 'All Games', icon: '⚡' },
      { id: 'Pool', label: 'Snooker & Pool', icon: '🎱' },
      { id: 'Table Tennis', label: 'Table Tennis', icon: '🏓' },
      { id: 'Carrom', label: 'Carrom & Boards', icon: '🎯' },
      { id: 'Foosball', label: 'Foosball & Arcade', icon: '⚽' },
      { id: 'Console PS5', label: 'Console Lounge', icon: '🎮' },
    ];
    gamingStations.forEach((st) => {
      if (
        st.category &&
        !base.some((b) => b.id.toLowerCase() === st.category.toLowerCase())
      ) {
        base.push({
          id: st.category,
          label: st.category,
          icon: '✨',
        });
      }
    });
    return base;
  }, [gamingStations]);

  // Filter stations based on selected category & search query
  const filteredStations = useMemo(() => {
    return gamingStations.filter((st) => {
      const matchCat =
        selectedCategory === 'ALL' ||
        st.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !searchQuery.trim() ||
        st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.turfName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.gameType.toLowerCase().includes(searchQuery.toLowerCase()) ||
        st.area.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [gamingStations, selectedCategory, searchQuery]);

  const isOwner = role === 'OWNER' || profile?.role === 'OWNER';

  // -------------------------------------------------------------
  // SELECTED GAME / STATION DETAIL VIEW (WITH PROMINENT GO BACK)
  // -------------------------------------------------------------
  if (selectedStation) {
    const parentTurf = turfs.find((t) => t.id === selectedStation.turfId);
    const stationPhotos = selectedStation.photos && selectedStation.photos.length > 0
      ? selectedStation.photos
      : [selectedStation.photoUrl];
    const currentPhoto = stationPhotos[activePhotoIdx] || selectedStation.photoUrl;

    return (
      <View style={styles.container}>
        {/* Navigation Go Back Header */}
        <View style={styles.detailHeaderBar}>
          <TouchableOpacity
            style={styles.detailGoBackButton}
            onPress={() => {
              setSelectedStation(null);
              setActivePhotoIdx(0);
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#ffffff" />
            <Text style={styles.detailGoBackText}>Back to Gaming Zone</Text>
          </TouchableOpacity>
          <Text style={styles.detailBadgeTag}>{selectedStation.category}</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScrollContent}>
          {/* Station Hero Image & Carousel (Works same as Turf) */}
          <View style={styles.detailImageWrapper}>
            <Image source={{ uri: currentPhoto }} style={styles.detailImage} />
            <View style={styles.detailPriceBadge}>
              <Text style={styles.detailPriceAmount}>₹{selectedStation.hourlyPrice}</Text>
              <Text style={styles.detailPriceUnit}>/ hour</Text>
            </View>

            {stationPhotos.length > 1 && (
              <View style={styles.detailPhotoCounterPill}>
                <Camera size={11} color="#ffffff" />
                <Text style={styles.detailPhotoCounterText}>
                  {activePhotoIdx + 1} / {stationPhotos.length} Photos
                </Text>
              </View>
            )}
          </View>

          {/* Multiple Photos Thumbnail Strip (Photo Gallery Same as Turf) */}
          {stationPhotos.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, gap: 8 }}
            >
              {stationPhotos.map((photoUri, pIdx) => {
                const isCurrent = activePhotoIdx === pIdx;
                return (
                  <TouchableOpacity
                    key={pIdx}
                    onPress={() => setActivePhotoIdx(pIdx)}
                    style={{
                      borderWidth: 2,
                      borderColor: isCurrent ? '#10b981' : '#334155',
                      borderRadius: 8,
                      overflow: 'hidden',
                    }}
                  >
                    <Image source={{ uri: photoUri }} style={{ width: 68, height: 46, borderRadius: 6 }} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.detailBody}>
            {/* Title & Venue */}
            <Text style={styles.detailTitle}>{selectedStation.title}</Text>
            <TouchableOpacity
              style={styles.detailVenueRow}
              onPress={() => {
                if (parentTurf) navigation.navigate('TurfDetails', { turf: parentTurf });
              }}
            >
              <Building size={14} color="#38bdf8" />
              <Text style={styles.detailVenueText}>
                {selectedStation.turfName} • {selectedStation.area}, {selectedStation.city}
              </Text>
              <ChevronRight size={14} color="#38bdf8" />
            </TouchableOpacity>

            {/* Description / Spec */}
            <View style={styles.detailSectionBox}>
              <Text style={styles.detailSectionTitle}>STATION SPECIFICATIONS</Text>
              <Text style={styles.detailSpecText}>{selectedStation.specification}</Text>
              <View style={styles.detailTimingRow}>
                <Clock size={14} color="#10b981" />
                <Text style={styles.detailTimingText}>
                  Min. Booking: {selectedStation.minDuration} minutes • Instant Slot Allocation
                </Text>
              </View>
            </View>

            {/* Included Equipment Checklist */}
            <View style={styles.detailSectionBox}>
              <Text style={styles.detailSectionTitle}>INCLUDED EQUIPMENT</Text>
              <View style={styles.checkPillsRow}>
                {selectedStation.equipmentChecklist.map((eq, i) => (
                  <View key={i} style={styles.checkPill}>
                    <CheckCircle2 size={13} color="#10b981" />
                    <Text style={styles.checkPillText}>{eq}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Amenities */}
            <View style={styles.detailSectionBox}>
              <Text style={styles.detailSectionTitle}>ZONE AMENITIES</Text>
              <View style={styles.amenitiesRow}>
                {selectedStation.amenities.map((am, i) => (
                  <View key={i} style={styles.amenityTagPill}>
                    <Sparkles size={12} color="#38bdf8" />
                    <Text style={styles.amenityTagPillText}>{am}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Bottom Dual Action Bar with Go Back & Book */}
        <View style={styles.detailBottomBar}>
          <TouchableOpacity
            style={styles.bottomSecondaryGoBackBtn}
            onPress={() => setSelectedStation(null)}
            activeOpacity={0.7}
          >
            <ArrowLeft size={16} color="#94a3b8" />
            <Text style={styles.bottomSecondaryGoBackText}>Go Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomBookNowBtn}
            onPress={() => {
              if (parentTurf) {
                navigation.navigate('BookingFlow', {
                  turf: parentTurf,
                  sport: selectedStation.category,
                });
              }
            }}
            activeOpacity={0.85}
          >
            <Zap size={16} color="#ffffff" />
            <Text style={styles.bottomBookNowText}>
              Book Slot (₹{selectedStation.hourlyPrice}/hr)
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------
  // MAIN GAMING ZONE LIST VIEW
  // -------------------------------------------------------------
  return (
    <View style={styles.container}>
      {/* Top Header Bar with Go Back and Title */}
      <View style={styles.topHeaderBar}>
        <TouchableOpacity
          style={styles.topGoBackBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color="#ffffff" />
          <Text style={styles.topGoBackText}>Back</Text>
        </TouchableOpacity>

        <View style={styles.topHeaderCenter}>
          <Text style={styles.topHeaderTitle}>Indoor Gaming Zone</Text>
        </View>

        {isOwner ? (
          <TouchableOpacity
            style={styles.topOwnerAddBtn}
            onPress={() => navigation.navigate('OwnerTurfs')}
            activeOpacity={0.8}
          >
            <Gamepad2 size={14} color="#10b981" />
            <Text style={styles.topOwnerAddBtnText}>+ Add Station</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Pool, TT, Carrom, Foosball, PS5..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Active Category Filter with Clear / Go Back Option */}
      {selectedCategory !== 'ALL' && (
        <View style={styles.activeFilterBanner}>
          <View style={styles.activeFilterLeft}>
            <Text style={styles.activeFilterPrefix}>Category:</Text>
            <Text style={styles.activeFilterName}>{selectedCategory}</Text>
          </View>
          <TouchableOpacity
            style={styles.clearFilterGoBackBtn}
            onPress={() => setSelectedCategory('ALL')}
            activeOpacity={0.7}
          >
            <RotateCcw size={12} color="#10b981" />
            <Text style={styles.clearFilterGoBackText}>Back to All Games</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Category Chips Scroll (Includes dynamic custom games) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.categoryScroll}
      >
        {dynamicCategories.map((cat) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                isSelected && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.categoryChipIcon}>{cat.icon}</Text>
              <Text
                style={[
                  styles.categoryChipText,
                  isSelected && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Stations List (Real Arenas Only) */}
      <FlatList
        data={filteredStations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#10b981"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Gamepad2 size={44} color="#64748b" style={{ marginBottom: 12 }} />
            <Text style={styles.emptyTitle}>No Real Gaming Stations Found</Text>
            <Text style={styles.emptySub}>
              {selectedCategory !== 'ALL'
                ? `No venue has added a "${selectedCategory}" station yet.`
                : 'Sports venues have not added indoor gaming zone stations yet.'}
            </Text>

            <View style={styles.emptyActionsRow}>
              {selectedCategory !== 'ALL' && (
                <TouchableOpacity
                  style={styles.emptyResetBtn}
                  onPress={() => {
                    setSelectedCategory('ALL');
                    setSearchQuery('');
                  }}
                >
                  <Text style={styles.emptyResetBtnText}>← Back to All Games</Text>
                </TouchableOpacity>
              )}

              {isOwner && (
                <TouchableOpacity
                  style={styles.emptyOwnerBtn}
                  onPress={() => navigation.navigate('OwnerTurfs')}
                >
                  <PlusCircle size={14} color="#064e3b" />
                  <Text style={styles.emptyOwnerBtnText}>Add Station as Owner</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.stationCard}
            onPress={() => setSelectedStation(item)}
            activeOpacity={0.88}
          >
            {/* Station Image & Badges */}
            <View style={styles.imageWrapper}>
              <Image source={{ uri: item.photoUrl }} style={styles.stationImage} />
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.gameType}</Text>
              </View>
              {item.distanceKm !== undefined && (
                <View style={styles.distanceBadge}>
                  <MapPin size={10} color="#10b981" />
                  <Text style={styles.distanceBadgeText}>
                    {item.distanceKm.toFixed(1)} km away
                  </Text>
                </View>
              )}
            </View>

            {/* Station Details */}
            <View style={styles.cardContent}>
              <View style={styles.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.stationTitle}>{item.title}</Text>
                  <Text style={styles.venueNameText}>
                    {item.turfName} • {item.area}, {item.city}
                  </Text>
                </View>
                <View style={styles.priceTag}>
                  <Text style={styles.priceAmount}>₹{item.hourlyPrice}</Text>
                  <Text style={styles.priceUnit}>/hr</Text>
                </View>
              </View>

              <Text style={styles.specText} numberOfLines={2}>{item.specification}</Text>

              {/* Equipment Checklist */}
              <View style={styles.checklistSection}>
                <Text style={styles.checklistHeader}>INCLUDED EQUIPMENT:</Text>
                <View style={styles.checkPillsRow}>
                  {item.equipmentChecklist.slice(0, 3).map((eq, i) => (
                    <View key={i} style={styles.checkPill}>
                      <CheckCircle2 size={11} color="#10b981" />
                      <Text style={styles.checkPillText}>{eq}</Text>
                    </View>
                  ))}
                  {item.equipmentChecklist.length > 3 && (
                    <Text style={styles.moreEquipText}>
                      +{item.equipmentChecklist.length - 3} more
                    </Text>
                  )}
                </View>
              </View>

              {/* Card Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.viewVenueBtn}
                  onPress={() => setSelectedStation(item)}
                >
                  <Text style={styles.viewVenueBtnText}>View Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.bookStationBtn}
                  onPress={() => {
                    const foundTurf = turfs.find((t) => t.id === item.turfId);
                    if (foundTurf) {
                      navigation.navigate('BookingFlow', {
                        turf: foundTurf,
                        sport: item.category,
                      });
                    }
                  }}
                >
                  <Zap size={14} color="#ffffff" />
                  <Text style={styles.bookStationBtnText}>
                    Book Table / Board (₹{item.hourlyPrice}/hr)
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#070b12',
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  topGoBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingRight: 10,
  },
  topGoBackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  topHeaderCenter: {
    alignItems: 'center',
  },
  topHeaderTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  topOwnerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  topOwnerAddBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  searchHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  activeFilterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  activeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activeFilterPrefix: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  activeFilterName: {
    color: '#10b981',
    fontSize: 13,
    fontWeight: '800',
  },
  clearFilterGoBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
  },
  clearFilterGoBackText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  categoryChipIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  categoryChipTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    gap: 16,
  },
  stationCard: {
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  imageWrapper: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  stationImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  categoryBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(7, 11, 18, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  categoryBadgeText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
  },
  distanceBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(7, 11, 18, 0.85)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  distanceBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  cardContent: {
    padding: 14,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  stationTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  venueNameText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  priceTag: {
    alignItems: 'flex-end',
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  priceAmount: {
    color: '#10b981',
    fontSize: 15,
    fontWeight: '900',
  },
  priceUnit: {
    color: '#6ee7b7',
    fontSize: 9,
    fontWeight: '700',
  },
  specText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
    marginBottom: 8,
  },
  checklistSection: {
    backgroundColor: '#070b14',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  checklistHeader: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  checkPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  checkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  checkPillText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  moreEquipText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    alignSelf: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewVenueBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewVenueBtnText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '700',
  },
  bookStationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
  },
  bookStationBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '800',
  },
  emptyCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#0d1527',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 20,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  emptySub: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptyActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  emptyResetBtn: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  emptyResetBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyOwnerBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyOwnerBtnText: {
    color: '#064e3b',
    fontSize: 12,
    fontWeight: '800',
  },

  // Details View Styles
  detailHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    backgroundColor: '#090d16',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  detailGoBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  detailGoBackText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  detailBadgeTag: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '800',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  detailScrollContent: {
    paddingBottom: 100,
  },
  detailImageWrapper: {
    height: 220,
    width: '100%',
    position: 'relative',
  },
  detailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  detailPriceBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(7, 11, 18, 0.92)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.4)',
    alignItems: 'flex-end',
  },
  detailPriceAmount: {
    color: '#10b981',
    fontSize: 18,
    fontWeight: '900',
  },
  detailPriceUnit: {
    color: '#6ee7b7',
    fontSize: 10,
    fontWeight: '700',
  },
  detailPhotoCounterPill: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  detailPhotoCounterText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  detailBody: {
    padding: 16,
  },
  detailTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 6,
  },
  detailVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
  },
  detailVenueText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
  },
  detailSectionBox: {
    backgroundColor: '#0d1527',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  detailSectionTitle: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  detailSpecText: {
    color: '#e2e8f0',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 10,
  },
  detailTimingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  detailTimingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  amenitiesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  amenityTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#070b14',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  amenityTagPillText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  detailBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#090d16',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bottomSecondaryGoBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  bottomSecondaryGoBackText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '700',
  },
  bottomBookNowBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    elevation: 3,
  },
  bottomBookNowText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
  },
});

