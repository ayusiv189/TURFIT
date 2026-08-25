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
import { getTurfs } from '../../services/dbService';
import { Turf } from '../../types';
import { TurfCard } from '../../components/TurfCard';
import { useLocation } from '../../contexts/LocationContext';
import { Search, SlidersHorizontal, MapPin, X, Check } from 'lucide-react-native';

interface ExploreTurfsScreenProps {
  navigation: any;
}

export const ExploreTurfsScreen: React.FC<ExploreTurfsScreenProps> = ({ navigation }) => {
  const { formatDistance } = useLocation();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSport, setSelectedSport] = useState<string>('ALL');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedPriceLimit, setSelectedPriceLimit] = useState<number>(3000);

  const sportsList = ['ALL', 'Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball', 'Pickleball'];

  useEffect(() => {
    getTurfs().then(setTurfs);
  }, []);

  const filteredTurfs = useMemo(() => {
    return turfs.filter((turf) => {
      const matchesSearch =
        turf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        turf.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        turf.city.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSport =
        selectedSport === 'ALL' || turf.sports?.includes(selectedSport);

      const matchesPrice = turf.basePrice <= selectedPriceLimit;

      return matchesSearch && matchesSport && matchesPrice;
    });
  }, [turfs, searchQuery, selectedSport, selectedPriceLimit]);

  return (
    <View style={styles.container}>
      {/* Search and Filter Row */}
      <View style={styles.searchHeader}>
        <View style={styles.searchBar}>
          <Search size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by turf name, area, sport..."
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

        <TouchableOpacity
          style={[styles.filterButton, selectedSport !== 'ALL' && styles.filterButtonActive]}
          onPress={() => setShowFilterModal(true)}
        >
          <SlidersHorizontal size={18} color={selectedSport !== 'ALL' ? '#10b981' : '#cbd5e1'} />
        </TouchableOpacity>
      </View>

      {/* Sport Category Pills */}
      <View style={styles.sportsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportsScroll}>
          {sportsList.map((sport) => (
            <TouchableOpacity
              key={sport}
              style={[styles.sportChip, selectedSport === sport && styles.sportChipActive]}
              onPress={() => setSelectedSport(sport)}
            >
              <Text
                style={[
                  styles.sportChipText,
                  selectedSport === sport && styles.sportChipTextActive,
                ]}
              >
                {sport === 'ALL' ? 'All Sports' : sport}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {filteredTurfs.length} {filteredTurfs.length === 1 ? 'Arena found' : 'Arenas found'}
        </Text>
      </View>

      {/* Turf List */}
      <FlatList
        data={filteredTurfs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <TurfCard
            turf={item}
            distance={formatDistance(item.latitude, item.longitude)}
            onPress={() => navigation.navigate('TurfDetails', { turfId: item.id })}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <MapPin size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Turfs Found</Text>
            <Text style={styles.emptyDesc}>
              Try adjusting your search keywords or clearing the active filters.
            </Text>
          </View>
        }
      />

      {/* Mobile Filter Modal */}
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
                  key={sport}
                  style={[
                    styles.modalSportChip,
                    selectedSport === sport && styles.modalSportChipActive,
                  ]}
                  onPress={() => setSelectedSport(sport)}
                >
                  <Text
                    style={[
                      styles.modalSportChipText,
                      selectedSport === sport && styles.modalSportChipTextActive,
                    ]}
                  >
                    {sport}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Max Price per Slot: ₹{selectedPriceLimit}</Text>
            <View style={styles.priceRow}>
              {[1000, 1500, 2000, 3000].map((p) => (
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
                  setSelectedPriceLimit(3000);
                }}
              >
                <Text style={styles.resetButtonText}>Reset</Text>
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
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
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
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 13,
  },
  filterButton: {
    backgroundColor: '#131b2e',
    width: 46,
    height: 46,
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
  sportsContainer: {
    marginBottom: 8,
  },
  sportsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sportChip: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 7,
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
    fontSize: 12,
    fontWeight: '600',
  },
  sportChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  resultsHeader: {
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
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
