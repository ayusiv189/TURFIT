import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOwnerTurfs,
  getArenasByTurf,
  getSlotsByArenaAndDate,
  batchGenerateMultiDaySlots,
  toggleSlotBlock,
  createSlot,
} from '../../services/dbService';
import { Turf, Arena, Slot } from '../../types';
import { Clock, Calendar, Sparkles, Lock, Unlock, Plus, Layers, X, Check, CalendarDays } from 'lucide-react-native';

const DAYS_OF_WEEK = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
];

export const OwnerSlotsScreen: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'AUTO' | 'MANUAL'>('AUTO');
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [arenas, setArenas] = useState<Arena[]>([]);
  const [selectedArena, setSelectedArena] = useState<Arena | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // 7-Day & Recurring Generator Controls
  const [genRange, setGenRange] = useState<'7_DAYS' | '14_DAYS' | 'SINGLE_DAY'>('7_DAYS');
  const [autoStartTime, setAutoStartTime] = useState('06:00');
  const [autoEndTime, setAutoEndTime] = useState('23:00');
  const [autoDuration, setAutoDuration] = useState('60');
  const [autoPrice, setAutoPrice] = useState('1500');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);

  // Manual Slot Creation Modal
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualStartTime, setManualStartTime] = useState('19:00');
  const [manualEndTime, setManualEndTime] = useState('20:00');
  const [manualPrice, setManualPrice] = useState('1500');
  const [manualMaxPlayers, setManualMaxPlayers] = useState('10');
  const [manualStatus, setManualStatus] = useState<'AVAILABLE' | 'BLOCKED'>('AVAILABLE');
  const [savingManual, setSavingManual] = useState(false);

  // Next 14 days quick selector
  const [dateList, setDateList] = useState<{ date: string; day: string; label: string }[]>([]);

  useEffect(() => {
    const dates = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 0; i < 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const day = dayNames[d.getDay()];
      const label = `${d.getDate()} ${monthNames[d.getMonth()]}`;
      dates.push({ date: dateStr, day, label });
    }
    setDateList(dates);
  }, []);

  useEffect(() => {
    if (!user) return;
    getOwnerTurfs(user.uid).then((data) => {
      setTurfs(data);
      if (data.length > 0) {
        setSelectedTurf(data[0]);
      }
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (selectedTurf) {
      getArenasByTurf(selectedTurf.id).then((arenaList) => {
        setArenas(arenaList);
        if (arenaList.length > 0) {
          setSelectedArena(arenaList[0]);
          setAutoPrice(String(arenaList[0].pricePerSlot || selectedTurf.basePrice || 1500));
          setManualPrice(String(arenaList[0].pricePerSlot || selectedTurf.basePrice || 1500));
        } else {
          setSelectedArena(null);
        }
      });
    }
  }, [selectedTurf]);

  const loadSlots = async () => {
    if (!selectedArena || !selectedDate) return;
    try {
      const s = await getSlotsByArenaAndDate(selectedArena.id, selectedDate);
      setSlots(s);
    } catch (err) {
      console.warn('Error loading slots:', err);
    }
  };

  useEffect(() => {
    loadSlots();
  }, [selectedArena, selectedDate]);

  const toggleDayFilter = (dayKey: string) => {
    if (selectedDays.includes(dayKey)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== dayKey));
      } else {
        Alert.alert('Required', 'At least one day must be active for generation.');
      }
    } else {
      setSelectedDays([...selectedDays, dayKey]);
    }
  };

  const handleGenerate7DaySlots = async () => {
    if (!selectedTurf || !selectedArena || !user) return;
    setGenerating(true);
    try {
      const targetDates: string[] = [];
      const numDays = genRange === '7_DAYS' ? 7 : genRange === '14_DAYS' ? 14 : 1;
      const dayMap: Record<number, string> = {
        0: 'Sun',
        1: 'Mon',
        2: 'Tue',
        3: 'Wed',
        4: 'Thu',
        5: 'Fri',
        6: 'Sat',
      };

      if (genRange === 'SINGLE_DAY') {
        targetDates.push(selectedDate);
      } else {
        for (let i = 0; i < numDays; i++) {
          const d = new Date();
          d.setDate(d.getDate() + i);
          const dayKey = dayMap[d.getDay()];
          if (selectedDays.includes(dayKey)) {
            targetDates.push(d.toISOString().split('T')[0]);
          }
        }
      }

      if (targetDates.length === 0) {
        Alert.alert('No Matching Days', 'No dates match the selected day filters.');
        return;
      }

      const totalCreated = await batchGenerateMultiDaySlots(
        selectedTurf.id,
        selectedArena.id,
        user.uid,
        targetDates,
        autoStartTime,
        autoEndTime,
        parseInt(autoDuration, 10) || 60,
        parseInt(autoPrice, 10) || 1500
      );

      await loadSlots();
      Alert.alert(
        'Slots Generated!',
        `Generated ${totalCreated} slots across ${targetDates.length} days for "${selectedArena.name}". Ready for player reservations.`
      );
    } catch (err) {
      console.warn('Error generating slots:', err);
      Alert.alert('Error', 'Failed to generate recurring slots.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCreateManualSlot = async () => {
    if (!selectedTurf || !selectedArena || !user) return;
    setSavingManual(true);
    try {
      const dayName = new Date(manualDate).toLocaleDateString('en-US', { weekday: 'long' });
      await createSlot({
        turfId: selectedTurf.id,
        arenaId: selectedArena.id,
        ownerId: user.uid,
        date: manualDate,
        day: dayName,
        startTime: manualStartTime,
        endTime: manualEndTime,
        durationMinutes: 60,
        price: parseInt(manualPrice, 10) || 1500,
        status: manualStatus,
        bookingType: 'NONE',
        creationType: 'MANUAL',
        maxPlayers: parseInt(manualMaxPlayers, 10) || 10,
        visibleToPlayers: true,
      });
      setShowManualModal(false);
      if (manualDate === selectedDate) {
        await loadSlots();
      }
      Alert.alert('Success', 'Manual slot created and live for player bookings.');
    } catch (err) {
      console.warn('Error creating manual slot:', err);
      Alert.alert('Error', 'Could not create manual slot.');
    } finally {
      setSavingManual(false);
    }
  };

  const handleToggleBlock = async (slot: Slot) => {
    try {
      await toggleSlotBlock(slot.id, slot.status === 'BLOCKED');
      await loadSlots();
    } catch (err) {
      console.warn('Error toggling slot block:', err);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
      {/* Mode Switcher */}
      <View style={styles.modeTabs}>
        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'AUTO' && styles.modeTabActive]}
          onPress={() => setActiveTab('AUTO')}
        >
          <Sparkles size={16} color={activeTab === 'AUTO' ? '#064e3b' : '#94a3b8'} />
          <Text style={[styles.modeTabText, activeTab === 'AUTO' && styles.modeTabTextActive]}>
            7-Day Auto Generator
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeTab, activeTab === 'MANUAL' && styles.modeTabActive]}
          onPress={() => {
            setActiveTab('MANUAL');
            setShowManualModal(true);
          }}
        >
          <Plus size={16} color={activeTab === 'MANUAL' ? '#064e3b' : '#94a3b8'} />
          <Text style={[styles.modeTabText, activeTab === 'MANUAL' && styles.modeTabTextActive]}>
            Create Manual Slot
          </Text>
        </TouchableOpacity>
      </View>

      {/* Turf Selector */}
      <Text style={styles.sectionLabel}>Select Venue</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        {turfs.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.pill, selectedTurf?.id === t.id && styles.pillActive]}
            onPress={() => setSelectedTurf(t)}
          >
            <Text style={[styles.pillText, selectedTurf?.id === t.id && styles.pillTextActive]}>
              {t.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Arena / Pitch Selector */}
      <Text style={styles.sectionLabel}>Select Ground Pitch / Sport</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollRow}>
        {arenas.map((a) => (
          <TouchableOpacity
            key={a.id}
            style={[styles.pill, selectedArena?.id === a.id && styles.pillActive]}
            onPress={() => setSelectedArena(a)}
          >
            <Text style={[styles.pillText, selectedArena?.id === a.id && styles.pillTextActive]}>
              {a.name} ({a.sport})
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* 7-Day Slot Generator Card */}
      {activeTab === 'AUTO' && (
        <View style={styles.generatorCard}>
          <View style={styles.genCardHeader}>
            <CalendarDays size={18} color="#10b981" />
            <Text style={styles.genCardTitle}>7-Day Recurring Slot Generator</Text>
          </View>

          {/* Range Selector */}
          <Text style={styles.inputLabel}>Generation Horizon</Text>
          <View style={styles.rangeRow}>
            <TouchableOpacity
              style={[styles.rangeBtn, genRange === '7_DAYS' && styles.rangeBtnActive]}
              onPress={() => setGenRange('7_DAYS')}
            >
              <Text style={[styles.rangeBtnText, genRange === '7_DAYS' && styles.rangeBtnTextActive]}>
                Next 7 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rangeBtn, genRange === '14_DAYS' && styles.rangeBtnActive]}
              onPress={() => setGenRange('14_DAYS')}
            >
              <Text style={[styles.rangeBtnText, genRange === '14_DAYS' && styles.rangeBtnTextActive]}>
                Next 14 Days
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.rangeBtn, genRange === 'SINGLE_DAY' && styles.rangeBtnActive]}
              onPress={() => setGenRange('SINGLE_DAY')}
            >
              <Text style={[styles.rangeBtnText, genRange === 'SINGLE_DAY' && styles.rangeBtnTextActive]}>
                Selected Date
              </Text>
            </TouchableOpacity>
          </View>

          {/* Days of Week Filters */}
          {genRange !== 'SINGLE_DAY' && (
            <>
              <Text style={styles.inputLabel}>Apply to Specific Days</Text>
              <View style={styles.daysRow}>
                {DAYS_OF_WEEK.map((d) => {
                  const active = selectedDays.includes(d.key);
                  return (
                    <TouchableOpacity
                      key={d.key}
                      style={[styles.dayChip, active && styles.dayChipActive]}
                      onPress={() => toggleDayFilter(d.key)}
                    >
                      <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                        {d.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}

          {/* Hours, Intervals & Pricing */}
          <View style={styles.genInputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Start Hour</Text>
              <TextInput
                style={styles.textInput}
                value={autoStartTime}
                onChangeText={setAutoStartTime}
                placeholder="06:00"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>End Hour</Text>
              <TextInput
                style={styles.textInput}
                value={autoEndTime}
                onChangeText={setAutoEndTime}
                placeholder="23:00"
                placeholderTextColor="#64748b"
              />
            </View>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>Price / Slot (₹)</Text>
              <TextInput
                style={styles.textInput}
                value={autoPrice}
                onChangeText={setAutoPrice}
                keyboardType="numeric"
                placeholder="1500"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          {/* Execute Generation Button */}
          <TouchableOpacity
            style={[styles.genButton, generating && styles.disabledBtn]}
            onPress={handleGenerate7DaySlots}
            disabled={generating || !selectedArena}
          >
            {generating ? (
              <ActivityIndicator color="#064e3b" size="small" />
            ) : (
              <View style={styles.genBtnInner}>
                <Sparkles size={16} color="#064e3b" />
                <Text style={styles.genButtonText}>
                  {genRange === '7_DAYS'
                    ? 'Generate Next 7-Days Schedule'
                    : genRange === '14_DAYS'
                    ? 'Generate 14-Days Schedule'
                    : `Generate Slots for ${selectedDate}`}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Date Horizon Scroller */}
      <Text style={styles.sectionLabel}>Inspect Live Schedule for Date</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dateScroll}>
        {dateList.map((d) => {
          const isSelected = selectedDate === d.date;
          return (
            <TouchableOpacity
              key={d.date}
              style={[styles.dateCard, isSelected && styles.dateCardActive]}
              onPress={() => setSelectedDate(d.date)}
            >
              <Text style={[styles.dateDay, isSelected && styles.dateDayActive]}>{d.day}</Text>
              <Text style={[styles.dateLabel, isSelected && styles.dateLabelActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Slots Grid */}
      <View style={styles.slotsHeaderRow}>
        <Text style={styles.sectionLabel}>
          Live Slots on {selectedDate} ({slots.length})
        </Text>
      </View>

      {slots.length === 0 ? (
        <View style={styles.emptyCard}>
          <Clock size={36} color="#64748b" />
          <Text style={styles.emptyTitle}>No Slots for {selectedDate}</Text>
          <Text style={styles.emptyDesc}>
            Use the 7-Day Auto Generator above to populate this schedule or create a custom manual slot.
          </Text>
        </View>
      ) : (
        <View style={styles.slotsGrid}>
          {slots.map((slot) => {
            const isBlocked = slot.status === 'BLOCKED';
            const isBooked =
              slot.status === 'BOOKED' ||
              slot.status === 'BOOKED_BY_PLAYER' ||
              slot.status === 'BOOKED_BY_OWNER';

            return (
              <View
                key={slot.id}
                style={[
                  styles.slotCard,
                  isBooked && styles.slotCardBooked,
                  isBlocked && styles.slotCardBlocked,
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.slotTime}>{slot.startTime} - {slot.endTime}</Text>
                  <Text style={styles.slotPrice}>₹{slot.price}</Text>
                  {slot.bookedByPlayerName && (
                    <Text style={styles.slotBookerText} numberOfLines={1}>
                      {slot.bookedByPlayerName}
                    </Text>
                  )}
                </View>

                {isBooked ? (
                  <View style={styles.bookedBadge}>
                    <Text style={styles.bookedText}>RESERVED</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.blockBtn, isBlocked ? styles.unblockBtn : styles.blockActionBtn]}
                    onPress={() => handleToggleBlock(slot)}
                  >
                    {isBlocked ? <Unlock size={12} color="#10b981" /> : <Lock size={12} color="#ef4444" />}
                    <Text style={[styles.blockBtnText, isBlocked ? styles.unblockBtnText : styles.blockActionText]}>
                      {isBlocked ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Manual Slot Creation Modal */}
      <Modal visible={showManualModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Custom Manual Slot</Text>
              <TouchableOpacity onPress={() => setShowManualModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.modalInput}
                value={manualDate}
                onChangeText={setManualDate}
                placeholder="2026-08-24"
                placeholderTextColor="#64748b"
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Start Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualStartTime}
                    onChangeText={setManualStartTime}
                    placeholder="19:00"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>End Time</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualEndTime}
                    onChangeText={setManualEndTime}
                    placeholder="20:00"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Price (₹)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualPrice}
                    onChangeText={setManualPrice}
                    keyboardType="numeric"
                    placeholder="1500"
                    placeholderTextColor="#64748b"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Max Players</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={manualMaxPlayers}
                    onChangeText={setManualMaxPlayers}
                    keyboardType="numeric"
                    placeholder="10"
                    placeholderTextColor="#64748b"
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>Initial Slot Status</Text>
              <View style={styles.statusSelectRow}>
                <TouchableOpacity
                  style={[styles.statusChoice, manualStatus === 'AVAILABLE' && styles.statusChoiceActive]}
                  onPress={() => setManualStatus('AVAILABLE')}
                >
                  <Text style={[styles.statusChoiceText, manualStatus === 'AVAILABLE' && styles.statusChoiceTextActive]}>
                    Available
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.statusChoice, manualStatus === 'BLOCKED' && styles.statusChoiceBlockedActive]}
                  onPress={() => setManualStatus('BLOCKED')}
                >
                  <Text style={[styles.statusChoiceText, manualStatus === 'BLOCKED' && styles.statusChoiceTextActive]}>
                    Blocked / Reserved
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.submitManualBtn, savingManual && styles.disabledBtn]}
              onPress={handleCreateManualSlot}
              disabled={savingManual}
            >
              {savingManual ? (
                <ActivityIndicator color="#064e3b" size="small" />
              ) : (
                <Text style={styles.submitManualBtnText}>Create & Publish Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090d16',
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 50,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeTabActive: {
    backgroundColor: '#10b981',
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  modeTabTextActive: {
    color: '#064e3b',
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 8,
    marginTop: 4,
  },
  scrollRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  pill: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pillActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  pillText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  generatorCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  genCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  genCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  rangeRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  rangeBtn: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  rangeBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  rangeBtnText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  rangeBtnTextActive: {
    color: '#10b981',
  },
  daysRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  dayChip: {
    flex: 1,
    backgroundColor: '#0b1120',
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  dayChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  dayChipText: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: '#ffffff',
  },
  genInputsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  inputCol: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#090d16',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  genButton: {
    backgroundColor: '#10b981',
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  genButtonText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  dateScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  dateCard: {
    backgroundColor: '#131b2e',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    minWidth: 70,
  },
  dateCardActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  dateDay: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  dateDayActive: {
    color: '#064e3b',
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 2,
  },
  dateLabelActive: {
    color: '#064e3b',
  },
  slotsHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  emptyCard: {
    backgroundColor: '#131b2e',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
    marginTop: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 16,
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  slotCard: {
    width: '48%',
    backgroundColor: '#131b2e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  slotCardBooked: {
    borderColor: 'rgba(56, 189, 248, 0.4)',
    backgroundColor: 'rgba(56, 189, 248, 0.05)',
  },
  slotCardBlocked: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
  },
  slotTime: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  slotPrice: {
    fontSize: 11,
    fontWeight: '800',
    color: '#10b981',
    marginTop: 2,
  },
  slotBookerText: {
    fontSize: 9,
    color: '#38bdf8',
    fontWeight: '600',
    marginTop: 2,
  },
  bookedBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  bookedText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#38bdf8',
  },
  blockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 4,
  },
  blockActionBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  unblockBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  blockBtnText: {
    fontSize: 9,
    fontWeight: '700',
  },
  blockActionText: {
    color: '#ef4444',
  },
  unblockBtnText: {
    color: '#10b981',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#090d16',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
  },
  modalInput: {
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  statusSelectRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  statusChoice: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#131b2e',
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  statusChoiceActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  statusChoiceBlockedActive: {
    backgroundColor: '#450a0a',
    borderColor: '#ef4444',
  },
  statusChoiceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
  },
  statusChoiceTextActive: {
    color: '#ffffff',
  },
  submitManualBtn: {
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  submitManualBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
});
