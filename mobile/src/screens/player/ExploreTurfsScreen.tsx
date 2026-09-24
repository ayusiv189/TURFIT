import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { getTurfs, getAllArenas } from '../../services/dbService';
import { getAllActiveOffers } from '../../services/communityService';
import { Turf, Arena, Offer } from '../../types';
import { TurfCard } from '../../components/TurfCard';
import { PitchCard, PitchCardData } from '../../components/PitchCard';
import { PromotionalBannerCarousel } from '../../components/PromotionalBannerCarousel';
import { GoogleAdMobBanner } from '../../components/GoogleAdMobBanner';
import { useLocation } from '../../contexts/LocationContext';
import {
  Search,
  SlidersHorizontal,
  MapPin,
  X,
  Check,
  Building2,
  Navigation,
} from 'lucide-react-native';

interface ExploreTurfsScreenProps {
  navigation: any;
  route?: any;
}

export const ExploreTurfsScreen: React.FC<ExploreTurfsScreenProps> = ({ navigation, route }) => {
  const { formatDistance, city: currentCity, setCity: setCurrentCity } = useLocation();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [viewMode, setViewMode] = useState<'PITCHES' | 'VENUES'>('VENUES');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>(route?.params?.sport || 'ALL');
  const [selectedCity, setSelectedCity] = useState<string>('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearchInput, setCitySearchInput] = useState('');
  const [selectedPriceLimit, setSelectedPriceLimit] = useState<number>(5000);

  useEffect(() => {
    if (route?.params?.sport) {
      setSelectedSport(route.params.sport);
    }
  }, [route?.params?.sport]);

  const sportsList = [
    { key: 'ALL', label: 'All Sports', icon: '🌐' },
    { key: 'Football', label: 'Football', icon: '⚽' },
    { key: 'Badminton', label: 'Badminton', icon: '🏸' },
    { key: 'Cricket', label: 'Cricket', icon: '🏏' },
    { key: 'Tennis', label: 'Tennis', icon: '🎾' },
    { key: 'Basketball', label: 'Basketball', icon: '🏀' },
    { key: 'Pickleball', label: 'Pickleball', icon: '🏓' },
  ];

  useEffect(() => {
    Promise.all([getTurfs(), getAllArenas(), getAllActiveOffers()]).then(([turfsData, arenasData, offersData]) => {
      setTurfs(turfsData);
      setArenas(arenasData);
      setOffers(offersData || []);
    });
  }, []);

  // Extract all unique cities dynamically from registered turfs
  const availableCities = useMemo(() => {
    const citySet = new Set<string>();
    turfs.forEach((t) => {
      if (t.city && t.city.trim()) {
        citySet.add(t.city.trim());
      }
    });
    // Add default popular Indian cities if not present
    ['Mumbai', 'Delhi', 'Bengaluru', 'Pune', 'Hyderabad', 'Chennai'].forEach((c) => citySet.add(c));
    return ['ALL', ...Array.from(citySet).sort()];
  }, [turfs]);

  // Filtered cities in city picker modal
  const modalFilteredCities = useMemo(() => {
    if (!citySearchInput.trim()) return availableCities;
    return availableCities.filter((c) =>
      c.toLowerCase().includes(citySearchInput.toLowerCase())
    );
  }, [availableCities, citySearchInput]);

  const filteredTurfs = useMemo(() => {
    return turfs.filter((turf) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        turf.name.toLowerCase().includes(q) ||
        (turf.area && turf.area.toLowerCase().includes(q)) ||
        (turf.city && turf.city.toLowerCase().includes(q)) ||
        (turf.sports && turf.sports.some((s) => s.toLowerCase().includes(q)));

      const matchesSport =
        selectedSport === 'ALL' || (turf.sports && turf.sports.includes(selectedSport));

      const matchesCity =
        selectedCity === 'ALL' ||
        (turf.city && turf.city.trim().toLowerCase() === selectedCity.toLowerCase());

      const matchesPrice = turf.basePrice <= selectedPriceLimit;

      return matchesSearch && matchesSport && matchesCity && matchesPrice;
    });
  }, [turfs, searchQuery, selectedSport, selectedCity, selectedPriceLimit]);

  const filteredPitches = useMemo(() => {
    if (selectedSport === 'ALL') return [];

    const turfMap = new Map<string, Turf>();
    turfs.forEach((t) => turfMap.set(t.id, t));

    const targetSportLower = selectedSport.toLowerCase();
    const q = searchQuery.toLowerCase().trim();

    const results: PitchCardData[] = [];
    const turfsWithArenaCovered = new Set<string>();

    // 1. Process explicit Arena entries from the database
    arenas.forEach((arena) => {
      const arenaSports = (arena.sports && arena.sports.length > 0)
        ? arena.sports.map((s) => s.toLowerCase())
        : (arena.sport ? [arena.sport.toLowerCase()] : []);

      const parentTurf = turfMap.get(arena.turfId);
      if (!parentTurf) return;

      const turfSports = parentTurf.sports ? parentTurf.sports.map((s) => s.toLowerCase()) : [];

      // Check if arena supports this sport directly, or if it's a shared astroturf ground hosting Football & Cricket
      const hasDirectSport = arenaSports.includes(targetSportLower) || (arena.sport && arena.sport.toLowerCase().includes(targetSportLower));
      const isFootOrCric = targetSportLower.includes('football') || targetSportLower.includes('cricket');
      const arenaIsFootOrCric = arenaSports.some((s) => s.includes('football') || s.includes('cricket'));
      const turfHasBoth = turfSports.some((s) => s.includes('football')) && turfSports.some((s) => s.includes('cricket'));

      const isEligible = hasDirectSport || (isFootOrCric && arenaIsFootOrCric && turfHasBoth);
      if (!isEligible) return;

      // City Filter
      if (
        selectedCity !== 'ALL' &&
        parentTurf.city &&
        parentTurf.city.trim().toLowerCase() !== selectedCity.toLowerCase()
      ) {
        return;
      }

      // Price Filter
      const price = arena.pricePerSlot || parentTurf.basePrice || 0;
      if (price > selectedPriceLimit) return;

      // Search Query Filter
      const matchesSearch =
        !q ||
        arena.name.toLowerCase().includes(q) ||
        parentTurf.name.toLowerCase().includes(q) ||
        (parentTurf.area && parentTurf.area.toLowerCase().includes(q)) ||
        (parentTurf.city && parentTurf.city.toLowerCase().includes(q)) ||
        (arena.description && arena.description.toLowerCase().includes(q));

      if (!matchesSearch) return;

      turfsWithArenaCovered.add(parentTurf.id);

      const pitchPhotos =
        arena.photos && arena.photos.length > 0 && arena.photos[0]
          ? arena.photos
          : parentTurf.photos && parentTurf.photos.length > 0
          ? parentTurf.photos
          : [];

      const allSportsList: string[] = Array.from(new Set([
        ...(arena.sports || [arena.sport]),
        ...((isFootOrCric && turfHasBoth) ? ['Football', 'Cricket'] : []),
      ]));

      const isMultiSport = allSportsList.length > 1;

      results.push({
        id: arena.id,
        arenaId: arena.id,
        name: arena.name,
        sport: selectedSport, // Keep the active sport context so the player sees what they searched for
        turfId: parentTurf.id,
        turfName: parentTurf.name,
        turfArea: parentTurf.area,
        turfCity: parentTurf.city,
        distance: formatDistance(parentTurf.latitude, parentTurf.longitude),
        capacity: arena.capacity,
        surface: (arena as any).surface || (targetSportLower.includes('badminton') ? 'Indoor Synthetic / Wooden' : 'FIFA AstroTurf'),
        description: arena.description,
        pricePerSlot: price,
        photos: pitchPhotos,
        isUnderMaintenance: arena.isUnderMaintenance,
        supportedSports: allSportsList,
        isMultiSport,
      });
    });

    // 2. Fallback for turfs that list this sport in `turf.sports`, but don't have explicit arena docs
    turfs.forEach((parentTurf) => {
      if (turfsWithArenaCovered.has(parentTurf.id)) return;

      const hasSport =
        parentTurf.sports && parentTurf.sports.some((s) => s.toLowerCase() === targetSportLower);
      if (!hasSport) return;

      // City Filter
      if (
        selectedCity !== 'ALL' &&
        parentTurf.city &&
        parentTurf.city.trim().toLowerCase() !== selectedCity.toLowerCase()
      ) {
        return;
      }

      // Price Filter
      if (parentTurf.basePrice > selectedPriceLimit) return;

      // Search Query Filter
      const matchesSearch =
        !q ||
        parentTurf.name.toLowerCase().includes(q) ||
        (parentTurf.area && parentTurf.area.toLowerCase().includes(q)) ||
        (parentTurf.city && parentTurf.city.toLowerCase().includes(q));

      if (!matchesSearch) return;

      const isFootOrCric = targetSportLower.includes('football') || targetSportLower.includes('cricket');
      const turfSports = parentTurf.sports ? parentTurf.sports.map((s) => s.toLowerCase()) : [];
      const turfHasBoth = turfSports.some((s) => s.includes('football')) && turfSports.some((s) => s.includes('cricket'));
      const allSportsList: string[] = Array.from(new Set([
        selectedSport,
        ...((isFootOrCric && turfHasBoth) ? ['Football', 'Cricket'] : []),
      ]));

      results.push({
        id: `default-${parentTurf.id}-${selectedSport}`,
        arenaId: '',
        name: `${parentTurf.name} • ${selectedSport} Pitch`,
        sport: selectedSport,
        turfId: parentTurf.id,
        turfName: parentTurf.name,
        turfArea: parentTurf.area,
        turfCity: parentTurf.city,
        distance: formatDistance(parentTurf.latitude, parentTurf.longitude),
        capacity: targetSportLower.includes('badminton') ? 4 : 14,
        surface: targetSportLower.includes('badminton') ? 'Indoor Wooden / Synthetic' : 'FIFA 50mm AstroTurf',
        description: `Official certified ${selectedSport} facility at ${parentTurf.name}. Full lighting & equipment available.`,
        pricePerSlot: parentTurf.basePrice,
        photos: parentTurf.photos || [],
        isUnderMaintenance: false,
        supportedSports: allSportsList,
        isMultiSport: allSportsList.length > 1,
      });
    });

    return results;
  }, [selectedSport, arenas, turfs, selectedCity, selectedPriceLimit, searchQuery, formatDistance]);

  return (
    <View style={styles.container}>
      {/* Search and Filter Row */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by city, turf name, or area..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {!!searchQuery && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {/* City Filter Modal Trigger Button */}
        <TouchableOpacity
          style={[styles.cityFilterButton, selectedCity !== 'ALL' && styles.cityFilterButtonActive]}
          onPress={() => setShowCityModal(true)}
        >
          <Building2 size={18} color={selectedCity !== 'ALL' ? '#38bdf8' : '#cbd5e1'} />
        </TouchableOpacity>

        {/* Filter Sliders Button */}
        <TouchableOpacity
          style={[
            styles.filterButton,
            (selectedSport !== 'ALL' || selectedPriceLimit < 5000) && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal
            size={18}
            color={selectedSport !== 'ALL' || selectedPriceLimit < 5000 ? '#10b981' : '#cbd5e1'}
          />
        </TouchableOpacity>
      </View>

      {/* Quick City Filter Pills Row */}
      <View style={styles.citiesContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.citiesScroll}
        >
          <TouchableOpacity
            style={[styles.cityPickerTag, selectedCity !== 'ALL' && styles.cityPickerTagActive]}
            onPress={() => setShowCityModal(true)}
          >
            <MapPin size={13} color={selectedCity !== 'ALL' ? '#38bdf8' : '#94a3b8'} />
            <Text
              style={[
                styles.cityPickerTagText,
                selectedCity !== 'ALL' && styles.cityPickerTagTextActive,
              ]}
            >
              {selectedCity === 'ALL' ? 'Search City' : selectedCity}
            </Text>
          </TouchableOpacity>

          {availableCities.map((cityName) => (
            <TouchableOpacity
              key={cityName}
              style={[styles.cityChip, selectedCity === cityName && styles.cityChipActive]}
              onPress={() => {
                setSelectedCity(cityName);
                if (cityName !== 'ALL') {
                  setCurrentCity(cityName);
                }
              }}
            >
              <Text
                style={[
                  styles.cityChipText,
                  selectedCity === cityName && styles.cityChipTextActive,
                ]}
              >
                {cityName === 'ALL' ? '🌐 All Cities' : `📍 ${cityName}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Sport Category Pills */}
      <View style={styles.sportsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportsScroll}
        >
          {sportsList.map((sport) => (
            <TouchableOpacity
              key={sport.key}
              style={[styles.sportChip, selectedSport === sport.key && styles.sportChipActive]}
              onPress={() => {
                setSelectedSport(sport.key);
                if (sport.key !== 'ALL') {
                  setViewMode('PITCHES');
                } else {
                  setViewMode('VENUES');
                }
              }}
            >
              <Text
                style={[
                  styles.sportChipText,
                  selectedSport === sport.key && styles.sportChipTextActive,
                ]}
              >
                {sport.icon} {sport.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* When a specific sport is selected, show Pitches vs Venues switcher */}
      {selectedSport !== 'ALL' && (
        <View style={styles.viewModeToggleRow}>
          <TouchableOpacity
            style={[styles.viewModePill, viewMode === 'PITCHES' && styles.viewModePillActive]}
            onPress={() => setViewMode('PITCHES')}
          >
            <Text
              style={[
                styles.viewModePillText,
                viewMode === 'PITCHES' && styles.viewModePillTextActive,
              ]}
            >
              {selectedSport === 'Football'
                ? '⚽ Football Pitches'
                : selectedSport === 'Badminton'
                ? '🏸 Badminton Courts'
                : `🎯 ${selectedSport} Pitches`}{' '}
              ({filteredPitches.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.viewModePill, viewMode === 'VENUES' && styles.viewModePillActive]}
            onPress={() => setViewMode('VENUES')}
          >
            <Text
              style={[
                styles.viewModePillText,
                viewMode === 'VENUES' && styles.viewModePillTextActive,
              ]}
            >
              🏟️ Whole Venues ({filteredTurfs.length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Results Header with City context */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {selectedSport !== 'ALL' && viewMode === 'PITCHES'
            ? `${filteredPitches.length} ${filteredPitches.length === 1 ? selectedSport + ' pitch' : selectedSport + ' pitches'} found`
            : `${filteredTurfs.length} ${filteredTurfs.length === 1 ? 'Arena found' : 'Arenas found'}`}
          {selectedCity !== 'ALL' ? ` in ${selectedCity}` : ''}
        </Text>

        {selectedCity !== 'ALL' && (
          <TouchableOpacity
            style={styles.clearCityBtn}
            onPress={() => setSelectedCity('ALL')}
          >
            <Text style={styles.clearCityBtnText}>Show All Cities ✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Main List: Pitches or Venues */}
      {selectedSport !== 'ALL' && viewMode === 'PITCHES' ? (
        <FlatList
          data={filteredPitches}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <PitchCard
              pitch={item}
              onBookPitch={() =>
                navigation.navigate('BookingFlow', {
                  turfId: item.turfId,
                  arenaId: item.arenaId || undefined,
                  selectedSport: item.sport,
                })
              }
              onViewTurf={() => navigation.navigate('TurfDetails', { turfId: item.turfId })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>
                {selectedSport === 'Football' ? '⚽' : selectedSport === 'Badminton' ? '🏸' : '🎯'}
              </Text>
              <Text style={styles.emptyTitle}>No {selectedSport} Pitches Found</Text>
              <Text style={styles.emptyDesc}>
                {selectedCity !== 'ALL'
                  ? `No verified ${selectedSport} pitches found in ${selectedCity}. Try selecting "All Cities" or switching to general venues.`
                  : `No verified ${selectedSport} grounds found matching your filters. Try clearing your search keywords.`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                {selectedCity !== 'ALL' && (
                  <TouchableOpacity
                    style={styles.resetCityBtn}
                    onPress={() => setSelectedCity('ALL')}
                  >
                    <Text style={styles.resetCityBtnText}>View All Cities</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.resetCityBtn, { backgroundColor: '#1e293b' }]}
                  onPress={() => setSelectedSport('ALL')}
                >
                  <Text style={[styles.resetCityBtnText, { color: '#cbd5e1' }]}>Show All Sports</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredTurfs}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={{ marginBottom: 12 }}>
              <PromotionalBannerCarousel audience="PLAYERS" navigation={navigation} />
            </View>
          }
          ListFooterComponent={
            <View style={{ marginTop: 8, marginBottom: 20 }}>
              <GoogleAdMobBanner format="BANNER" placement="ExploreTurfsFooter" />
            </View>
          }
          renderItem={({ item }) => {
            const turfOffers = offers.filter((o) => o.turfId === item.id || o.turfId === 'ALL');
            return (
              <TurfCard
                turf={item}
                offers={turfOffers}
                distance={formatDistance(item.latitude, item.longitude)}
                onPress={() => navigation.navigate('TurfDetails', { turfId: item.id })}
              />
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MapPin size={40} color="#64748b" />
              <Text style={styles.emptyTitle}>No Turfs Found</Text>
              <Text style={styles.emptyDesc}>
                {selectedCity !== 'ALL'
                  ? `No sports grounds registered in ${selectedCity} matching your filters. Try selecting "All Cities" or searching a nearby area.`
                  : 'Try adjusting your search keywords or clearing active filters.'}
              </Text>
              {selectedCity !== 'ALL' && (
                <TouchableOpacity
                  style={styles.resetCityBtn}
                  onPress={() => setSelectedCity('ALL')}
                >
                  <Text style={styles.resetCityBtnText}>View All Cities</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* City Search and Selection Modal */}
      <Modal visible={showCityModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.cityModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Building2 size={20} color="#38bdf8" />
                <Text style={styles.modalTitle}>Select City to Search</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCityModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* City search input inside modal */}
            <View style={styles.cityModalSearch}>
              <Search size={16} color="#94a3b8" />
              <TextInput
                style={styles.cityModalSearchInput}
                placeholder="Type city name (e.g. Mumbai, Bangalore)..."
                placeholderTextColor="#64748b"
                value={citySearchInput}
                onChangeText={setCitySearchInput}
                autoFocus
              />
              {!!citySearchInput && (
                <TouchableOpacity onPress={() => setCitySearchInput('')}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView style={styles.cityListScroll} showsVerticalScrollIndicator={false}>
              {modalFilteredCities.map((cityName) => {
                const isSelected = selectedCity === cityName;
                const turfCount =
                  cityName === 'ALL'
                    ? turfs.length
                    : turfs.filter(
                        (t) => t.city && t.city.trim().toLowerCase() === cityName.toLowerCase()
                      ).length;

                return (
                  <TouchableOpacity
                    key={cityName}
                    style={[styles.cityListItem, isSelected && styles.cityListItemActive]}
                    onPress={() => {
                      setSelectedCity(cityName);
                      if (cityName !== 'ALL') {
                        setCurrentCity(cityName);
                      }
                      setShowCityModal(false);
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <MapPin size={16} color={isSelected ? '#38bdf8' : '#94a3b8'} />
                      <Text style={[styles.cityListItemText, isSelected && styles.cityListItemTextActive]}>
                        {cityName === 'ALL' ? 'All Cities' : cityName}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={styles.cityTurfCount}>{turfCount} grounds</Text>
                      {isSelected && <Check size={16} color="#38bdf8" strokeWidth={3} />}
                    </View>
                  </TouchableOpacity>
                );
              })}

              {modalFilteredCities.length === 0 && (
                <View style={{ paddingVertical: 30, alignItems: 'center' }}>
                  <Text style={{ color: '#94a3b8', fontSize: 13 }}>No cities matching "{citySearchInput}"</Text>
                  <TouchableOpacity
                    style={[styles.cityListItem, { marginTop: 12, justifyContent: 'center' }]}
                    onPress={() => {
                      setSelectedCity(citySearchInput.trim());
                      setShowCityModal(false);
                    }}
                  >
                    <Text style={{ color: '#38bdf8', fontWeight: '700' }}>Search "{citySearchInput.trim()}" anyway</Text>
                  </TouchableOpacity>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Filters Modal */}
      <Modal visible={showFilterModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Arenas</Text>
              <TouchableOpacity onPress={() => setShowFilterModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.filterSectionTitle}>Select Sport</Text>
            <View style={styles.sportGrid}>
              {sportsList.map((sport) => (
                <TouchableOpacity
                  key={sport.key}
                  style={[
                    styles.modalSportChip,
                    selectedSport === sport.key && styles.modalSportChipActive,
                  ]}
                  onPress={() => {
                    setSelectedSport(sport.key);
                    if (sport.key !== 'ALL') {
                      setViewMode('PITCHES');
                    } else {
                      setViewMode('VENUES');
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.modalSportChipText,
                      selectedSport === sport.key && styles.modalSportChipTextActive,
                    ]}
                  >
                    {sport.icon} {sport.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Max Pitch Price: ₹{selectedPriceLimit}</Text>
            <View style={styles.priceRow}>
              {[1000, 1500, 2000, 3000, 5000].map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priceChip, selectedPriceLimit === p && styles.priceChipActive]}
                  onPress={() => setSelectedPriceLimit(p)}
                >
                  <Text
                    style={[
                      styles.priceChipText,
                      selectedPriceLimit === p && styles.priceChipTextActive,
                    ]}
                  >
                    Up to ₹{p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.resetButton}
                onPress={() => {
                  setSelectedSport('ALL');
                  setSelectedCity('ALL');
                  setSelectedPriceLimit(5000);
                  setViewMode('VENUES');
                }}
              >
                <Text style={styles.resetButtonText}>Reset All</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
  searchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  cityFilterButton: {
    backgroundColor: '#131b2e',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityFilterButtonActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  filterButton: {
    backgroundColor: '#131b2e',
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  citiesContainer: {
    marginBottom: 8,
  },
  citiesScroll: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  cityPickerTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cityPickerTagActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  cityPickerTagText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  cityPickerTagTextActive: {
    color: '#38bdf8',
  },
  cityChip: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cityChipActive: {
    backgroundColor: '#0369a1',
    borderColor: '#38bdf8',
  },
  cityChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  cityChipTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  sportsContainer: {
    marginBottom: 8,
  },
  sportsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sportChip: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  sportChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  sportChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  sportChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  viewModePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  viewModePillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  viewModePillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  viewModePillTextActive: {
    color: '#34d399',
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 4,
  },
  resultsCount: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
  },
  clearCityBtn: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  clearCityBtnText: {
    fontSize: 11,
    color: '#38bdf8',
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 6,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingHorizontal: 30,
    lineHeight: 18,
  },
  resetCityBtn: {
    marginTop: 14,
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  resetCityBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  cityModalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '75%',
    borderTopWidth: 1,
    borderColor: '#38bdf8',
  },
  cityModalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0a0f1d',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 14,
  },
  cityModalSearchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 13,
  },
  cityListScroll: {
    maxHeight: 320,
  },
  cityListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  cityListItemActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderBottomColor: '#38bdf8',
  },
  cityListItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#cbd5e1',
  },
  cityListItemTextActive: {
    color: '#38bdf8',
    fontWeight: '800',
  },
  cityTurfCount: {
    fontSize: 11,
    color: '#64748b',
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderTopWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#ffffff',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 10,
    marginTop: 6,
  },
  sportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  modalSportChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalSportChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  modalSportChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalSportChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  priceChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  priceChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  priceChipText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  priceChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
  },
  resetButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  applyButton: {
    flex: 2,
    backgroundColor: '#10b981',
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});
