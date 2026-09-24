import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Slot } from '../types';

interface SlotChipProps {
  slot: Slot;
  selected?: boolean;
  isSelected?: boolean;
  onPress?: () => void;
  onSelect?: (slot: Slot) => void;
}

export const SlotChip: React.FC<SlotChipProps> = ({
  slot,
  selected,
  isSelected,
  onPress,
  onSelect,
}) => {
  const isAvailable = slot.status === 'AVAILABLE';
  const isCurrentlySelected = Boolean(isSelected ?? selected);

  const handlePress = () => {
    if (onSelect) {
      onSelect(slot);
    }
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={!isAvailable}
      onPress={handlePress}
      style={[
        styles.chip,
        isAvailable ? styles.availableChip : styles.bookedChip,
        isCurrentlySelected && styles.selectedChip,
      ]}
    >
      <Text style={[styles.timeText, isCurrentlySelected && styles.selectedText, !isAvailable && styles.bookedText]}>
        {slot.startTime} - {slot.endTime}
      </Text>
      <View style={styles.bottomRow}>
        <Text style={[styles.priceText, isCurrentlySelected && styles.selectedText, !isAvailable && styles.bookedPriceText]}>
          ₹{slot.price}
        </Text>
        <View style={isAvailable ? styles.availableBadge : styles.bookedBadge}>
          <Text style={isAvailable ? styles.availableStatus : styles.bookedStatus}>
            {isAvailable ? 'AVAILABLE' : 'RESERVED'}
          </Text>
        </View>
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
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
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
    color: '#fca5a5',
  },
  bookedPriceText: {
    color: '#94a3b8',
    textDecorationLine: 'line-through',
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
  availableBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bookedBadge: {
    backgroundColor: 'rgba(239, 68, 68, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
    borderColor: '#ef4444',
  },
  statusText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  availableStatus: {
    color: '#10b981',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  bookedStatus: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
