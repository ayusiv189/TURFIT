import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Slot } from '../types';

interface SlotChipProps {
  slot: Slot;
  selected: boolean;
  onPress: () => void;
}

export const SlotChip: React.FC<SlotChipProps> = ({ slot, selected, onPress }) => {
  const isAvailable = slot.status === 'AVAILABLE';

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!isAvailable}
      onPress={onPress}
      style={[
        styles.chip,
        isAvailable ? styles.availableChip : styles.bookedChip,
        selected && styles.selectedChip,
      ]}
    >
      <Text style={[styles.timeText, selected && styles.selectedText, !isAvailable && styles.bookedText]}>
        {slot.startTime} - {slot.endTime}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={[styles.priceText, selected && styles.selectedText, !isAvailable && styles.bookedText]}>
          ₹{slot.price}
        </Text>
        <Text style={[styles.statusText, isAvailable ? styles.availableStatus : styles.bookedStatus]}>
          {isAvailable ? 'AVAILABLE' : 'BOOKED'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 8,
    width: '48%',
  },
  availableChip: {
    backgroundColor: '#131b2e',
    borderColor: '#334155',
  },
  bookedChip: {
    backgroundColor: 'rgba(30, 41, 59, 0.4)',
    borderColor: '#1e293b',
    opacity: 0.6,
  },
  selectedChip: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  timeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  selectedText: {
    color: '#ffffff',
  },
  bookedText: {
    color: '#64748b',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#10b981',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  availableStatus: {
    color: '#10b981',
  },
  bookedStatus: {
    color: '#ef4444',
  },
});
