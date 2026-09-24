import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import {
  getOwnerTurfs,
  createTurfWithArenas,
  createArena,
  getArenasByTurf,
  toggleTurfClosure,
  toggleArenaMaintenance,
  updateTurfPaymentDetails,
  uploadVerificationDocument,
  submitTurfForReview,
  getVerificationDocuments,
  updateTurf,
  deleteTurf,
  checkTurfActiveBookings,
  checkArenaActiveBookings,
  deleteArena,
  updateArena,
  toggleTurfFeaturedStatus,
  getEffectiveOwnerSubscription,
} from '../../services/dbService';
import { Turf, Arena, VerificationDocument, DocumentType, PlanFeatureConfig } from '../../types';
import {
  Building,
  Plus,
  X,
  MapPin,
  DollarSign,
  Check,
  AlertTriangle,
  Wrench,
  Power,
  CreditCard,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Clock,
  XCircle,
  FileText,
  Award,
  Edit2,
  Trash2,
  ExternalLink,
  Camera,
  Image as ImageIcon,
  CheckSquare,
  Square,
  Sparkles,
  Star,
  Gamepad2,
} from 'lucide-react-native';

const INDOOR_GAME_OPTIONS = [
  { id: 'Pool', label: '8-Ball / 9-Ball Pool', icon: '🎱', defaultPrice: '220', defaultCapacity: '4', defaultTitle: 'Table #1 (8-Ball Pool)' },
  { id: 'Snooker', label: 'English Snooker', icon: '🎱', defaultPrice: '250', defaultCapacity: '4', defaultTitle: 'Table #1 (Snooker)' },
  { id: 'Table Tennis', label: 'Table Tennis (TT)', icon: '🏓', defaultPrice: '180', defaultCapacity: '4', defaultTitle: 'ITTF Table #1' },
  { id: 'Carrom', label: 'Tournament Carrom', icon: '🎯', defaultPrice: '120', defaultCapacity: '4', defaultTitle: 'Carrom Board A' },
  { id: 'Foosball', label: 'Foosball Table', icon: '⚽', defaultPrice: '150', defaultCapacity: '4', defaultTitle: 'Foosball Table 1' },
  { id: 'Air Hockey', label: 'Air Hockey', icon: '🕹️', defaultPrice: '160', defaultCapacity: '2', defaultTitle: 'Air Hockey Station 1' },
  { id: 'Console PS5', label: 'PS5 Lounge Pod', icon: '🎮', defaultPrice: '300', defaultCapacity: '4', defaultTitle: 'PS5 Gaming Pod 1' },
  { id: 'CUSTOM', label: '+ Other (Custom Game)', icon: '✨', defaultPrice: '200', defaultCapacity: '4', defaultTitle: 'Custom Station #1' },
];

const GAME_DEFAULT_PHOTOS: Record<string, string> = {
  'Pool': 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=800&q=80',
  'Snooker': 'https://images.unsplash.com/photo-1534423861386-85a16f5d13fd?auto=format&fit=crop&w=800&q=80',
  'Table Tennis': 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=800&q=80',
  'Carrom': 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?auto=format&fit=crop&w=800&q=80',
  'Foosball': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
  'Air Hockey': 'https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?auto=format&fit=crop&w=800&q=80',
  'Console PS5': 'https://images.unsplash.com/photo-1606813907291-d86efa9b94db?auto=format&fit=crop&w=800&q=80',
  'CUSTOM': 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
};

const CUSTOM_GAME_EMOJIS = ['✨', '🎯', '🕹️', '🎮', '🎲', '🎳', '🕶️', '♟️', '🏹', '🥊', '🎪', '🏓', '🎱'];

const INDOOR_EQUIPMENT_TAGS = [
  '2 Cues + Balls Included',
  'Chalk + Triangle Included',
  '4 TT Bats + Match Balls',
  'ITTF Approved Net',
  'Champion Carrom Board + Coins',
  'Heavy Striker + Boric Powder',
  '2 DualSense Wireless Controllers',
  'EA Sports FC / FIFA 25',
];

const AMENITY_OPTIONS = [
  'Floodlights',
  'Changing Rooms',
  'Drinking Water',
  'Parking',
  'Equipment Rental',
  'Shower / Washrooms',
  'First Aid',
  'Cafeteria / Refreshments',
];

export const OwnerTurfsScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [turfArenas, setTurfArenas] = useState<Record<string, Arena[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [expandedTurfId, setExpandedTurfId] = useState<string | null>(null);
  const [ownerFeatures, setOwnerFeatures] = useState<PlanFeatureConfig | null>(null);
  const [togglingFeaturedId, setTogglingFeaturedId] = useState<string | null>(null);

  // Verification upload modal
  const [verificationModalTurf, setVerificationModalTurf] = useState<Turf | null>(null);
  const [docType, setDocType] = useState<DocumentType>('BUSINESS_REGISTRATION');
  const [docName, setDocName] = useState('');
  const [docUrl, setDocUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [turfDocs, setTurfDocs] = useState<Record<string, VerificationDocument[]>>({});

  // Add Turf Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [area, setArea] = useState('Bandra West');
  const [city, setCity] = useState('Mumbai');
  const [locationUrl, setLocationUrl] = useState('');
  const [basePrice, setBasePrice] = useState('1500');
  const [phone, setPhone] = useState('+91 98200 12345');
  const [openingTime, setOpeningTime] = useState('06:00');
  const [closingTime, setClosingTime] = useState('23:00');
  const [selectedSports, setSelectedSports] = useState<string[]>(['Football', 'Cricket']);
  const [facilities, setFacilities] = useState<string[]>(['Floodlights', 'Changing Rooms', 'Drinking Water', 'Parking']);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInputUrl, setPhotoInputUrl] = useState('');
  const [creating, setCreating] = useState(false);

  // Edit Turf Modal state
  const [editingTurf, setEditingTurf] = useState<Turf | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editArea, setEditArea] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editLocationUrl, setEditLocationUrl] = useState('');
  const [editBasePrice, setEditBasePrice] = useState('1500');
  const [editPhone, setEditPhone] = useState('');
  const [editOpeningTime, setEditOpeningTime] = useState('06:00');
  const [editClosingTime, setEditClosingTime] = useState('23:00');
  const [editSports, setEditSports] = useState<string[]>([]);
  const [editFacilities, setEditFacilities] = useState<string[]>([]);
  const [editPhotos, setEditPhotos] = useState<string[]>([]);
  const [editPhotoInputUrl, setEditPhotoInputUrl] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Edit Pitch (Arena) Modal state
  const [editingArena, setEditingArena] = useState<Arena | null>(null);
  const [editArenaName, setEditArenaName] = useState('');
  const [editArenaSport, setEditArenaSport] = useState('Football');
  const [editArenaSports, setEditArenaSports] = useState<string[]>(['Football']);
  const [editArenaPrice, setEditArenaPrice] = useState('1500');
  const [editArenaPhotos, setEditArenaPhotos] = useState<string[]>([]);
  const [editArenaPhotoInputUrl, setEditArenaPhotoInputUrl] = useState('');
  const [savingArenaEdit, setSavingArenaEdit] = useState(false);

  // Add Pitch (Arena) Modal state
  const [addingArenaTurf, setAddingArenaTurf] = useState<Turf | null>(null);
  const [newFacilityType, setNewFacilityType] = useState<'OUTDOOR_TURF' | 'INDOOR_GAME'>('OUTDOOR_TURF');
  const [newArenaName, setNewArenaName] = useState('');
  const [newArenaSport, setNewArenaSport] = useState('Football');
  const [newArenaSports, setNewArenaSports] = useState<string[]>(['Football']);
  const [newArenaPrice, setNewArenaPrice] = useState('1500');
  const [newArenaCapacity, setNewArenaCapacity] = useState('14');
  const [newArenaDesc, setNewArenaDesc] = useState('');
  const [newIndoorGame, setNewIndoorGame] = useState('Pool');
  const [newIndoorEquip, setNewIndoorEquip] = useState<string[]>([
    '2 Cues + Balls Included',
    'Chalk + Triangle Included',
  ]);
  const [newHasAC, setNewHasAC] = useState(true);
  const [newHasLounge, setNewHasLounge] = useState(true);
  const [newSlotDuration, setNewSlotDuration] = useState<30 | 60>(60);
  const [newArenaPhotos, setNewArenaPhotos] = useState<string[]>([]);
  const [newArenaPhotoInputUrl, setNewArenaPhotoInputUrl] = useState('');
  const [newCustomGameName, setNewCustomGameName] = useState('');
  const [newCustomGameIcon, setNewCustomGameIcon] = useState('✨');
  const [newCustomEquipInput, setNewCustomEquipInput] = useState('');
  const [savingNewArena, setSavingNewArena] = useState(false);

  // Closure / Maintenance Modals
  const [closureModalTurf, setClosureModalTurf] = useState<Turf | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [closureNotice, setClosureNotice] = useState('');
  const [savingClosure, setSavingClosure] = useState(false);

  const sportsOptions = ['Football', 'Cricket', 'Badminton', 'Tennis', 'Basketball', 'Pickleball', 'Padel', 'Volleyball'];

  const loadTurfs = async () => {
    if (!user) return;
    try {
      const [data, subDetails] = await Promise.all([
        getOwnerTurfs(user.uid),
        getEffectiveOwnerSubscription(user.uid).catch(() => null),
      ]);
      setTurfs(data);
      if (subDetails?.features) {
        setOwnerFeatures(subDetails.features);
      }

      // Load arenas & documents for each turf
      const arenasMap: Record<string, Arena[]> = {};
      const docsMap: Record<string, VerificationDocument[]> = {};
      for (const t of data) {
        const [aList, dList] = await Promise.all([
          getArenasByTurf(t.id),
          getVerificationDocuments(t.id),
        ]);
        arenasMap[t.id] = aList;
        docsMap[t.id] = dList as VerificationDocument[];
      }
      setTurfArenas(arenasMap);
      setTurfDocs(docsMap);
      if (data.length > 0 && !expandedTurfId) {
        setExpandedTurfId(data[0].id);
      }
    } catch (err) {
      console.warn('Error loading turfs:', err);
    }
  };

  useEffect(() => {
    loadTurfs();
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTurfs();
    setRefreshing(false);
  };

  const handleUploadDoc = async () => {
    if (!verificationModalTurf || !user || !docUrl.trim()) {
      Alert.alert('Required', 'Please enter a document reference / file URL.');
      return;
    }
    setUploadingDoc(true);
    try {
      await uploadVerificationDocument(verificationModalTurf.id, user.uid, {
        documentType: docType,
        documentName: docName.trim() || `${String(docType || 'document').replace(/_/g, ' ')} Document`,
        fileUrl: docUrl.trim(),
      });
      setDocUrl('');
      setDocName('');
      await loadTurfs();
      Alert.alert('Document Uploaded', 'Document sent to TurFit operations team for review.');
    } catch (err: any) {
      Alert.alert('Upload Failed', err.message || 'Error uploading document.');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleResubmitReview = async (turf: Turf) => {
    if (!user) return;
    try {
      await submitTurfForReview(turf.id, user.uid, profile?.displayName || 'Owner');
      await loadTurfs();
      Alert.alert('Submitted', 'Your venue has been submitted for admin verification.');
    } catch (err: any) {
      Alert.alert('Submission Error', err.message || 'Failed to submit.');
    }
  };

  const toggleSport = (sport: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editSports.includes(sport)) {
        setEditSports(editSports.filter((s) => s !== sport));
      } else {
        setEditSports([...editSports, sport]);
      }
    } else {
      if (selectedSports.includes(sport)) {
        setSelectedSports(selectedSports.filter((s) => s !== sport));
      } else {
        setSelectedSports([...selectedSports, sport]);
      }
    }
  };

  const toggleAmenity = (amenity: string, isEdit: boolean = false) => {
    if (isEdit) {
      if (editFacilities.includes(amenity)) {
        setEditFacilities(editFacilities.filter((f) => f !== amenity));
      } else {
        setEditFacilities([...editFacilities, amenity]);
      }
    } else {
      if (facilities.includes(amenity)) {
        setFacilities(facilities.filter((f) => f !== amenity));
      } else {
        setFacilities([...facilities, amenity]);
      }
    }
  };

  const handleLaunchCamera = async (isEdit: boolean = false) => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos directly.');
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        if (isEdit) {
          setEditPhotos((prev) => [...prev, ...newUrls]);
        } else {
          setPhotos((prev) => [...prev, ...newUrls]);
        }
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not launch camera.');
    }
  };

  const handlePickPhotos = async (isEdit: boolean = false) => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to pick photos.');
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        if (isEdit) {
          setEditPhotos((prev) => [...prev, ...newUrls]);
        } else {
          setPhotos((prev) => [...prev, ...newUrls]);
        }
      }
    } catch (err: any) {
      Alert.alert('Photo Picker Error', err.message || 'Could not pick photos.');
    }
  };

  const handleAddPhotoUrl = (isEdit: boolean = false) => {
    const urlToAdd = isEdit ? editPhotoInputUrl.trim() : photoInputUrl.trim();
    if (!urlToAdd) return;
    if (isEdit) {
      setEditPhotos((prev) => [...prev, urlToAdd]);
      setEditPhotoInputUrl('');
    } else {
      setPhotos((prev) => [...prev, urlToAdd]);
      setPhotoInputUrl('');
    }
  };

  const handleSetCoverPhoto = (idx: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditPhotos((prev) => {
        if (idx <= 0 || idx >= prev.length) return prev;
        const target = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        return [target, ...rest];
      });
    } else {
      setPhotos((prev) => {
        if (idx <= 0 || idx >= prev.length) return prev;
        const target = prev[idx];
        const rest = prev.filter((_, i) => i !== idx);
        return [target, ...rest];
      });
    }
  };

  const handleRemovePhoto = (idx: number, isEdit: boolean = false) => {
    if (isEdit) {
      setEditPhotos((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPhotos((prev) => prev.filter((_, i) => i !== idx));
    }
  };

  // -------------------------------------------------------------
  // ARENA & GAMING ZONE PHOTO HANDLERS (Add Arena Modal)
  // -------------------------------------------------------------
  const handleLaunchArenaCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos directly.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setNewArenaPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not launch camera.');
    }
  };

  const handlePickArenaPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to pick photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setNewArenaPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      Alert.alert('Photo Picker Error', err.message || 'Could not pick photos.');
    }
  };

  const handleAddArenaPhotoUrl = () => {
    const url = newArenaPhotoInputUrl.trim();
    if (!url) return;
    setNewArenaPhotos((prev) => [...prev, url]);
    setNewArenaPhotoInputUrl('');
  };

  const handleSetCoverArenaPhoto = (idx: number) => {
    setNewArenaPhotos((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [target, ...rest];
    });
  };

  const handleRemoveArenaPhoto = (idx: number) => {
    setNewArenaPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleUsePresetArenaPhoto = (presetUrl: string) => {
    if (!presetUrl) return;
    setNewArenaPhotos((prev) => {
      if (prev.includes(presetUrl)) return prev;
      return [presetUrl, ...prev];
    });
  };

  // -------------------------------------------------------------
  // ARENA & GAMING ZONE PHOTO HANDLERS (Edit Arena Modal)
  // -------------------------------------------------------------
  const handleLaunchEditArenaCamera = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Camera permission is required to capture photos directly.');
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setEditArenaPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      Alert.alert('Camera Error', err.message || 'Could not launch camera.');
    }
  };

  const handlePickEditArenaPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Permission Denied', 'Permission to access gallery is required to pick photos.');
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.7,
        base64: true,
      });
      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUrls = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setEditArenaPhotos((prev) => [...prev, ...newUrls]);
      }
    } catch (err: any) {
      Alert.alert('Photo Picker Error', err.message || 'Could not pick photos.');
    }
  };

  const handleAddEditArenaPhotoUrl = () => {
    const url = editArenaPhotoInputUrl.trim();
    if (!url) return;
    setEditArenaPhotos((prev) => [...prev, url]);
    setEditArenaPhotoInputUrl('');
  };

  const handleSetCoverEditArenaPhoto = (idx: number) => {
    setEditArenaPhotos((prev) => {
      if (idx <= 0 || idx >= prev.length) return prev;
      const target = prev[idx];
      const rest = prev.filter((_, i) => i !== idx);
      return [target, ...rest];
    });
  };

  const handleRemoveEditArenaPhoto = (idx: number) => {
    setEditArenaPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDeleteTurf = async (turf: Turf) => {
    try {
      // 1. Safeguard: verify there are no active upcoming confirmed player bookings
      const { activeCount, upcomingBookings } = await checkTurfActiveBookings(turf.id);
      if (activeCount > 0) {
        const earliest = upcomingBookings[0];
        Alert.alert(
          'Cannot Delete Venue',
          `"${turf.name}" has ${activeCount} active upcoming player booking(s) scheduled (e.g. ${earliest.playerName} on ${earliest.date} at ${earliest.startTime}).\n\nPlease honor or cancel these active reservations with the players before deleting this venue.`,
          [{ text: 'Understood', style: 'cancel' }]
        );
        return;
      }

      // 2. Safe to delete with confirmation prompt
      Alert.alert(
        'Delete Venue Permanently?',
        `Are you sure you want to delete "${turf.name}" and all its pitches? All associated slots and venue data will be removed. This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Permanently',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteTurf(turf.id);
                await loadTurfs();
                Alert.alert('Venue Deleted', `"${turf.name}" has been permanently removed.`);
              } catch (err: any) {
                Alert.alert('Delete Failed', err.message || 'Could not delete venue.');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error Checking Bookings', err.message || 'Could not verify booking status.');
    }
  };

  const handleDeleteArena = async (arena: Arena) => {
    try {
      const { activeCount, upcomingBookings } = await checkArenaActiveBookings(arena.id);
      if (activeCount > 0) {
        const earliest = upcomingBookings[0];
        Alert.alert(
          'Cannot Delete Pitch',
          `Pitch "${arena.name}" has ${activeCount} active upcoming player booking(s) scheduled (e.g. ${earliest.playerName} on ${earliest.date} at ${earliest.startTime}).\n\nPlease honor or cancel these active reservations before deleting this pitch.`,
          [{ text: 'Understood', style: 'cancel' }]
        );
        return;
      }

      Alert.alert(
        'Delete Pitch?',
        `Are you sure you want to delete pitch "${arena.name}"? Future unbooked slots for this pitch will be removed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete Pitch',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteArena(arena.id);
                await loadTurfs();
                Alert.alert('Pitch Deleted', `Pitch "${arena.name}" has been removed.`);
              } catch (err: any) {
                Alert.alert('Delete Failed', err.message || 'Could not delete pitch.');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not verify pitch booking status.');
    }
  };

  const toggleEditArenaSport = (sport: string) => {
    if (editArenaSports.includes(sport)) {
      if (editArenaSports.length === 1) {
        Alert.alert('At Least One Sport', 'A pitch must support at least one sport.');
        return;
      }
      setEditArenaSports(editArenaSports.filter((s) => s !== sport));
    } else {
      setEditArenaSports([...editArenaSports, sport]);
    }
  };

  const toggleNewArenaSport = (sport: string) => {
    if (newArenaSports.includes(sport)) {
      if (newArenaSports.length === 1) {
        Alert.alert('At Least One Sport', 'A pitch must support at least one sport.');
        return;
      }
      setNewArenaSports(newArenaSports.filter((s) => s !== sport));
    } else {
      setNewArenaSports([...newArenaSports, sport]);
    }
  };

  const openEditArenaModal = (arena: Arena) => {
    setEditingArena(arena);
    setEditArenaName(arena.name || '');
    const currentSports = arena.sports && arena.sports.length > 0
      ? arena.sports
      : [arena.sport || 'Football'];
    setEditArenaSports(currentSports);
    setEditArenaSport(currentSports[0]);
    setEditArenaPrice(String(arena.pricePerSlot || 1500));
    setEditArenaPhotos(arena.photos || []);
    setEditArenaPhotoInputUrl('');
  };

  const handleSaveEditArena = async () => {
    if (!editingArena) return;
    if (!editArenaName.trim()) {
      Alert.alert('Pitch Name Required', 'Please enter a pitch or court name.');
      return;
    }
    const finalSports = editArenaSports.length > 0 ? editArenaSports : ['Football'];
    setSavingArenaEdit(true);
    try {
      await updateArena(editingArena.id, {
        name: editArenaName.trim(),
        sport: finalSports[0],
        sports: finalSports,
        pricePerSlot: parseInt(editArenaPrice, 10) || 1500,
        photos: editArenaPhotos,
      });
      setEditingArena(null);
      await loadTurfs();
      Alert.alert('Pitch Updated', 'Pitch details and photos have been saved.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Could not update pitch.');
    } finally {
      setSavingArenaEdit(false);
    }
  };

  const openAddArenaModal = (turf: Turf) => {
    setAddingArenaTurf(turf);
    setNewFacilityType('OUTDOOR_TURF');
    const existingCount = (turfArenas[turf.id] || []).length;
    // Suggest next pitch identifier: Pitch A, Pitch B, Pitch C... or Pitch 2, etc.
    const pitchLetter = String.fromCharCode(65 + existingCount);
    setNewArenaName(`Pitch ${pitchLetter}`);
    const defaultSports = turf.sports && turf.sports.length > 0 ? turf.sports.slice(0, 2) : ['Football'];
    setNewArenaSports(defaultSports);
    setNewArenaSport(defaultSports[0]);
    setNewArenaPrice(String(turf.basePrice || 1500));
    setNewArenaCapacity('14');
    setNewArenaDesc('');
    setNewIndoorGame('Pool');
    setNewIndoorEquip(['2 Cues + Balls Included', 'Chalk + Triangle Included']);
    setNewHasAC(true);
    setNewHasLounge(true);
    setNewSlotDuration(60);
    setNewArenaPhotos([]);
    setNewArenaPhotoInputUrl('');
    setNewCustomGameName('');
    setNewCustomGameIcon('✨');
    setNewCustomEquipInput('');
  };

  const openAddGamingZoneModal = (turf: Turf) => {
    setAddingArenaTurf(turf);
    setNewFacilityType('INDOOR_GAME');
    setNewIndoorGame('Pool');
    const option = INDOOR_GAME_OPTIONS[0];
    const existingGaming = (turfArenas[turf.id] || []).filter(
      (a) => a.facilityType === 'INDOOR_GAME'
    ).length;
    setNewArenaName(option ? `Table #${existingGaming + 1} (8-Ball Pool)` : `Gaming Station #${existingGaming + 1}`);
    setNewArenaSports(['Pool']);
    setNewArenaSport('Pool');
    setNewArenaPrice(option ? option.defaultPrice : '220');
    setNewArenaCapacity(option ? option.defaultCapacity : '4');
    setNewArenaDesc(option ? `${turf.name} - 8-Ball Tournament Grade Pool Table` : 'Indoor Gaming Station');
    setNewIndoorEquip(['2 Cues + Balls Included', 'Chalk + Triangle Included']);
    setNewHasAC(true);
    setNewHasLounge(true);
    setNewSlotDuration(60);
    setNewArenaPhotos([]);
    setNewArenaPhotoInputUrl('');
    setNewCustomGameName('');
    setNewCustomGameIcon('✨');
    setNewCustomEquipInput('');
  };

  const handleSelectIndoorGame = (gameId: string) => {
    setNewIndoorGame(gameId);
    if (gameId === 'CUSTOM') {
      setNewArenaName('Gaming Station #1');
      setNewArenaPrice('200');
      setNewArenaCapacity('4');
      setNewIndoorEquip(['Standard Equipment Included']);
      setNewCustomGameName('');
      setNewCustomGameIcon('✨');
      return;
    }
    const option = INDOOR_GAME_OPTIONS.find((g) => g.id === gameId);
    if (option) {
      setNewArenaName(option.defaultTitle);
      setNewArenaPrice(option.defaultPrice);
      setNewArenaCapacity(option.defaultCapacity);
      if (gameId === 'Pool' || gameId === 'Snooker') {
        setNewIndoorEquip(['2 Cues + Balls Included', 'Chalk + Triangle Included']);
      } else if (gameId === 'Table Tennis') {
        setNewIndoorEquip(['4 TT Bats + Match Balls', 'ITTF Approved Net']);
      } else if (gameId === 'Carrom') {
        setNewIndoorEquip(['Champion Carrom Board + Coins', 'Heavy Striker + Boric Powder']);
      } else if (gameId === 'Console PS5') {
        setNewIndoorEquip(['2 DualSense Wireless Controllers', 'EA Sports FC / FIFA 25']);
      } else if (gameId === 'Air Hockey') {
        setNewIndoorEquip(['2 Pushers / Mallets Included', '2 Air Hockey Match Pucks']);
      } else if (gameId === 'Foosball') {
        setNewIndoorEquip(['3 Match Cork Balls', 'Smooth Chrome Rods']);
      } else {
        setNewIndoorEquip(['Standard Gear Included']);
      }
    }
  };

  const handleAddCustomEquipTag = () => {
    const trimmed = newCustomEquipInput.trim();
    if (!trimmed) return;
    if (!newIndoorEquip.includes(trimmed)) {
      setNewIndoorEquip((prev) => [...prev, trimmed]);
    }
    setNewCustomEquipInput('');
  };

  const toggleIndoorEquipTag = (tag: string) => {
    if (newIndoorEquip.includes(tag)) {
      setNewIndoorEquip(newIndoorEquip.filter((t) => t !== tag));
    } else {
      setNewIndoorEquip([...newIndoorEquip, tag]);
    }
  };

  const handleCreateNewArena = async () => {
    if (!addingArenaTurf || !user) return;
    if (!newArenaName.trim()) {
      Alert.alert('Name Required', 'Please enter a name or identifier (e.g. Table #1, Board A, Pitch 2).');
      return;
    }

    setSavingNewArena(true);
    try {
      if (newFacilityType === 'INDOOR_GAME') {
        let gameName = newIndoorGame;
        if (newIndoorGame === 'CUSTOM') {
          if (!newCustomGameName.trim()) {
            Alert.alert(
              'Custom Game Name Required',
              'Please enter the name of your game (e.g. Virtual Reality, Darts, Air Hockey, Board Games, Laser Tag).'
            );
            setSavingNewArena(false);
            return;
          }
          gameName = newCustomGameName.trim();
        }

        // Determine final photos for the gaming station
        let finalPhotos = [...newArenaPhotos];
        if (finalPhotos.length === 0) {
          const presetPhoto = GAME_DEFAULT_PHOTOS[newIndoorGame] || GAME_DEFAULT_PHOTOS['CUSTOM'];
          if (presetPhoto) {
            finalPhotos = [presetPhoto];
          } else if (addingArenaTurf.photos && addingArenaTurf.photos.length > 0) {
            finalPhotos = addingArenaTurf.photos.slice(0, 1);
          }
        }

        await createArena({
          turfId: addingArenaTurf.id,
          ownerId: user.uid,
          name: newArenaName.trim(),
          sport: gameName,
          sports: [gameName],
          facilityType: 'INDOOR_GAME',
          indoorGameType: gameName,
          tableOrBoardNumber: newArenaName.trim(),
          equipmentIncluded: newIndoorEquip,
          hasAirConditioning: newHasAC,
          hasLoungeAccess: newHasLounge,
          slotDurationOption: newSlotDuration,
          description: newArenaDesc.trim() || `${gameName} station at ${addingArenaTurf.name}`,
          capacity: parseInt(newArenaCapacity, 10) || 4,
          pricePerSlot: parseInt(newArenaPrice, 10) || 200,
          photos: finalPhotos,
          active: true,
        });

        // Ensure parent turf lists this game and has gaming zone enabled
        const updatedSports = Array.from(
          new Set([...(addingArenaTurf.sports || []), gameName])
        );
        const updatedIndoorGames = Array.from(
          new Set([...(addingArenaTurf.indoorGames || []), gameName])
        );
        await updateTurf(addingArenaTurf.id, {
          hasGamingZone: true,
          sports: updatedSports,
          indoorGames: updatedIndoorGames,
        });

        setAddingArenaTurf(null);
        await loadTurfs();
        Alert.alert(
          'Indoor Station Added! 🎮',
          `"${newArenaName}" (${gameName}) has been added to "${addingArenaTurf.name}" with ${finalPhotos.length} photo(s).\n\nPlayers can discover and book this station in the Gaming Zone!`
        );
      } else {
        const finalSports = newArenaSports.length > 0 ? newArenaSports : ['Football'];
        let finalPhotos = [...newArenaPhotos];
        if (finalPhotos.length === 0 && addingArenaTurf.photos && addingArenaTurf.photos.length > 0) {
          finalPhotos = addingArenaTurf.photos.slice(0, 1);
        }

        await createArena({
          turfId: addingArenaTurf.id,
          ownerId: user.uid,
          name: newArenaName.trim(),
          sport: finalSports[0],
          sports: finalSports,
          facilityType: 'OUTDOOR_TURF',
          description: newArenaDesc.trim() || `${finalSports.join(' & ')} pitch at ${addingArenaTurf.name}`,
          capacity: parseInt(newArenaCapacity, 10) || 14,
          pricePerSlot: parseInt(newArenaPrice, 10) || addingArenaTurf.basePrice || 1500,
          photos: finalPhotos,
          active: true,
        });

        setAddingArenaTurf(null);
        await loadTurfs();
        Alert.alert(
          'Pitch Added! 🎉',
          `"${newArenaName}" has been successfully registered to "${addingArenaTurf.name}" with ${finalPhotos.length} photo(s).\n\nSports: ${finalSports.join(', ')}\nShared inventory is active: slots booked for one sport lock the pitch automatically.`
        );
      }
    } catch (err: any) {
      Alert.alert('Failed to Add Station', err.message || 'Could not add station.');
    } finally {
      setSavingNewArena(false);
    }
  };

  const openEditTurfModal = (turf: Turf) => {
    setEditingTurf(turf);
    setEditName(turf.name || '');
    setEditDescription(turf.description || '');
    setEditAddress(turf.address || '');
    setEditArea(turf.area || '');
    setEditCity(turf.city || '');
    setEditLocationUrl(turf.locationUrl || '');
    setEditBasePrice(String(turf.basePrice || '1500'));
    setEditPhone(turf.phoneNumber || '');
    setEditOpeningTime(turf.openingTime || turf.openTime || '06:00');
    setEditClosingTime(turf.closingTime || turf.closeTime || '23:00');
    setEditSports(turf.sports && turf.sports.length > 0 ? turf.sports : ['Football']);
    setEditFacilities(
      turf.facilities && turf.facilities.length > 0
        ? turf.facilities
        : ['Floodlights', 'Changing Rooms', 'Drinking Water', 'Parking']
    );
    setEditPhotos(turf.photos || []);
    setEditPhotoInputUrl('');
  };

  const handleSaveEditTurf = async () => {
    if (!editingTurf) return;
    if (!editName.trim()) {
      Alert.alert('Turf Name Required', 'Please enter a name for your turf venue.');
      return;
    }
    if (!editCity.trim()) {
      Alert.alert('City is Compulsory', 'Please enter the city where the turf is located.');
      return;
    }
    if (!editLocationUrl.trim()) {
      Alert.alert(
        'Location Link Compulsory',
        'Please paste the Google Maps location link for your turf venue. This allows players to get direct directions via "View on Map".'
      );
      return;
    }

    setSavingEdit(true);
    try {
      await updateTurf(editingTurf.id, {
        name: editName.trim(),
        description: editDescription.trim(),
        address: editAddress.trim(),
        area: editArea.trim(),
        city: editCity.trim(),
        locationUrl: editLocationUrl.trim(),
        basePrice: parseInt(editBasePrice, 10) || 1500,
        phoneNumber: editPhone.trim(),
        openingTime: editOpeningTime.trim() || '06:00',
        closingTime: editClosingTime.trim() || '23:00',
        openTime: editOpeningTime.trim() || '06:00',
        closeTime: editClosingTime.trim() || '23:00',
        sports: editSports.length > 0 ? editSports : ['Football'],
        facilities: editFacilities,
        photos: editPhotos,
      });
      setEditingTurf(null);
      await loadTurfs();
      Alert.alert('Venue Updated', 'Turf details and photos have been updated successfully.');
    } catch (err: any) {
      Alert.alert('Update Failed', err.message || 'Failed to update turf.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleCreateTurf = async () => {
    if (!name.trim()) {
      Alert.alert('Turf Name Required', 'Please enter a name for your turf venue.');
      return;
    }
    if (!city.trim()) {
      Alert.alert('City is Compulsory', 'Please enter the city where the turf is located. City is required for players to find your turf.');
      return;
    }
    if (!locationUrl.trim()) {
      Alert.alert(
        'Location Link Compulsory',
        'Please paste the Google Maps location link for your turf venue. This allows players to get direct directions via "View on Map".'
      );
      return;
    }
    if (!user) return;
    setCreating(true);
    try {
      await createTurfWithArenas(
        {
          ownerId: user.uid,
          name: name.trim(),
          description: description.trim(),
          address: address.trim() || 'Sports Complex Road',
          area: area.trim() || 'Central',
          city: city.trim(),
          locationUrl: locationUrl.trim(),
          phoneNumber: phone.trim(),
          sports: selectedSports.length > 0 ? selectedSports : ['Football'],
          basePrice: parseInt(basePrice, 10) || 1500,
          openingTime: openingTime.trim() || '06:00',
          closingTime: closingTime.trim() || '23:00',
          openTime: openingTime.trim() || '06:00',
          closeTime: closingTime.trim() || '23:00',
          facilities: facilities.length > 0 ? facilities : ['Floodlights', 'Changing Rooms', 'Drinking Water', 'Parking'],
          photos: photos,
        },
        [
          {
            name: 'Pitch A (Main Arena)',
            sport: selectedSports[0] || 'Football',
            pricePerSlot: parseInt(basePrice, 10) || 1500,
            capacity: 14,
            photos: photos.slice(0, 1),
            ownerId: user.uid,
          },
        ]
      );
      setShowModal(false);
      setName('');
      setDescription('');
      setAddress('');
      setArea('');
      setCity('');
      setLocationUrl('');
      setPhotos([]);
      setPhotoInputUrl('');
      await loadTurfs();
      Alert.alert('Venue Added', 'New arena and pitches have been registered.');
    } catch (err) {
      console.warn('Error creating turf:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleTurfClosure = async (turf: Turf) => {
    const nextClosedState = !turf.isClosed;
    if (nextClosedState) {
      setClosureModalTurf(turf);
      setClosureReason(turf.closureReason || 'Annual pitch maintenance and grass replacement');
      setClosureNotice(turf.closureNotice || 'Venue temporarily unavailable. Reopening soon!');
    } else {
      // Reopening directly
      try {
        await toggleTurfClosure(turf.id, false, '', '');
        await loadTurfs();
        Alert.alert('Venue Reopened', `"${turf.name}" is now active and taking player bookings.`);
      } catch (err) {
        console.warn('Error reopening turf:', err);
      }
    }
  };

  const handleConfirmClosure = async () => {
    if (!closureModalTurf) return;
    setSavingClosure(true);
    try {
      await toggleTurfClosure(closureModalTurf.id, true, closureReason, closureNotice);
      setClosureModalTurf(null);
      await loadTurfs();
      Alert.alert('Venue Marked Closed', `"${closureModalTurf.name}" is marked temporarily closed with public notice.`);
    } catch (err) {
      console.warn('Error closing turf:', err);
    } finally {
      setSavingClosure(false);
    }
  };

  const handleToggleArenaMaintenance = async (arena: Arena) => {
    const nextState = !arena.isUnderMaintenance;
    try {
      await toggleArenaMaintenance(
        arena.id,
        nextState,
        nextState ? 'Pitch maintenance & turf grooming in progress' : ''
      );
      await loadTurfs();
      Alert.alert(
        nextState ? 'Pitch Under Maintenance' : 'Pitch Restored',
        `"${arena.name}" is now ${nextState ? 'marked under maintenance' : 'available for bookings'}.`
      );
    } catch (err) {
      console.warn('Error toggling maintenance:', err);
    }
  };

  const handleToggleFeaturedTurf = async (turf: Turf) => {
    // Check if the plan feature is permitted
    const isFeatureAllowed = ownerFeatures ? ownerFeatures.featuredTurf : true;
    const nextFeatured = !turf.isFeatured;

    if (nextFeatured && !isFeatureAllowed) {
      Alert.alert(
        'Upgrade to Pro / Enterprise Plan',
        'Sponsored Top Turf Ranking & Featured Badging requires an active Pro or Enterprise subscription. Upgrade your plan to rank at the top of player feeds.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () => navigation?.navigate('OwnerSubscription'),
          },
        ]
      );
      return;
    }

    setTogglingFeaturedId(turf.id);
    try {
      await toggleTurfFeaturedStatus(turf.id, nextFeatured);
      await loadTurfs();
      Alert.alert(
        nextFeatured ? '⭐ Venue Featured!' : 'Featured Status Removed',
        nextFeatured
          ? `"${turf.name}" is now ranked at the top of player searches with a verified Sponsored badge.`
          : `"${turf.name}" has returned to standard ranking.`
      );
    } catch (err) {
      console.warn('Error toggling featured status:', err);
      Alert.alert('Error', 'Failed to update featured status. Please try again.');
    } finally {
      setTogglingFeaturedId(null);
    }
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={turfs}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />}
        ListHeaderComponent={
          <View style={styles.headerBox}>
            <Text style={styles.headerTitle}>Venue & Ground Management</Text>
            <Text style={styles.headerSubtitle}>
              Configure arenas, submit verification documents, and manage live availability.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isExpanded = expandedTurfId === item.id;
          const arenas = turfArenas[item.id] || [];
          const docs = turfDocs[item.id] || [];
          const isClosed = item.isClosed;
          const vStatus = item.verificationStatus || 'pending_verification';
          const vLevel = item.verificationLevel || 'unverified';

          return (
            <View style={[styles.turfCard, isClosed && styles.turfCardClosed]}>
              <View style={styles.cardHeader}>
                <View style={[styles.turfIcon, isClosed && styles.turfIconClosed]}>
                  <Building size={20} color={isClosed ? '#ef4444' : '#10b981'} />
                </View>
                <View style={styles.turfInfo}>
                  <Text style={styles.turfName}>{item.name}</Text>
                  <Text style={styles.turfLocation}>{item.area}, {item.city}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.turfPrice}>₹{item.basePrice}/hr</Text>
                  <View style={[styles.statusBadge, isClosed ? styles.statusBadgeClosed : styles.statusBadgeActive]}>
                    <Text style={[styles.statusBadgeText, isClosed ? styles.statusTextClosed : styles.statusTextActive]}>
                      {isClosed ? 'CLOSED' : 'ACTIVE'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Verification Status Card */}
              <View
                style={{
                  backgroundColor:
                    vStatus === 'verified'
                      ? '#064e3b25'
                      : vStatus === 'rejected' || vStatus === 'suspended'
                      ? '#7f1d1d25'
                      : '#1e1b4b25',
                  borderColor:
                    vStatus === 'verified'
                      ? '#05966960'
                      : vStatus === 'rejected' || vStatus === 'suspended'
                      ? '#dc262660'
                      : '#6366f160',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  marginVertical: 6,
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {vStatus === 'verified' ? (
                      <ShieldCheck size={16} color="#34d399" />
                    ) : vStatus === 'under_review' ? (
                      <Clock size={16} color="#818cf8" />
                    ) : vStatus === 'rejected' || vStatus === 'suspended' ? (
                      <XCircle size={16} color="#f87171" />
                    ) : (
                      <AlertTriangle size={16} color="#fbbf24" />
                    )}
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: '800',
                        color:
                          vStatus === 'verified'
                            ? '#34d399'
                            : vStatus === 'rejected' || vStatus === 'suspended'
                            ? '#f87171'
                            : '#a5b4fc',
                        textTransform: 'uppercase',
                      }}
                    >
                      {String(vStatus || 'pending_verification').replace(/_/g, ' ')} • {String(vLevel || 'unverified').replace(/_/g, ' ')}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#4f46e5',
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 6,
                    }}
                    onPress={() => setVerificationModalTurf(item)}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 10, fontWeight: '700' }}>
                      + Docs ({docs.length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {item.verification?.rejectionReason && (
                  <Text style={{ color: '#fca5a5', fontSize: 11, marginTop: 4 }}>
                    Notice: {item.verification.rejectionReason}
                  </Text>
                )}

                {vStatus !== 'verified' && vStatus !== 'under_review' && (
                  <TouchableOpacity
                    style={{
                      backgroundColor: '#3b82f6',
                      marginTop: 6,
                      paddingVertical: 5,
                      borderRadius: 6,
                      alignItems: 'center',
                    }}
                    onPress={() => handleResubmitReview(item)}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                      Submit / Request Verification Review
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Photos Gallery Preview & Manage */}
              {item.photos && item.photos.length > 0 ? (
                <View style={styles.cardPhotoSection}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cardPhotoScroll}>
                    {item.photos.map((photoUri, pIdx) => (
                      <View key={pIdx} style={styles.cardPhotoWrapper}>
                        <Image source={{ uri: photoUri }} style={styles.cardPhotoImg} />
                        {pIdx === 0 && (
                          <View style={styles.coverBadge}>
                            <Text style={styles.coverBadgeText}>★ COVER</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </ScrollView>
                  <View style={styles.cardPhotoFooterRow}>
                    <Text style={styles.photoCountBadge}>📷 {item.photos.length} Photo{item.photos.length > 1 ? 's' : ''}</Text>
                    <TouchableOpacity
                      style={styles.cardManagePhotosBtn}
                      onPress={() => openEditTurfModal(item)}
                    >
                      <Camera size={12} color="#38bdf8" />
                      <Text style={styles.cardManagePhotosText}>Manage Photos</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.noPhotosPrompt}
                  onPress={() => openEditTurfModal(item)}
                  activeOpacity={0.8}
                >
                  <Camera size={15} color="#38bdf8" />
                  <Text style={styles.noPhotosPromptText}>+ Add Venue Photos (Uploads increase bookings by 4x)</Text>
                </TouchableOpacity>
              )}

              {/* Location Link Display */}
              {item.locationUrl ? (
                <TouchableOpacity
                  style={styles.locationLinkBox}
                  onPress={() => Linking.openURL(item.locationUrl!)}
                >
                  <MapPin size={13} color="#38bdf8" />
                  <Text style={styles.locationLinkText} numberOfLines={1}>
                    Maps: {item.locationUrl}
                  </Text>
                  <ExternalLink size={12} color="#38bdf8" />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.missingLocationBox}
                  onPress={() => openEditTurfModal(item)}
                >
                  <AlertTriangle size={13} color="#f59e0b" />
                  <Text style={styles.missingLocationText}>
                    Missing Google Maps Link (Compulsory) • Tap to add
                  </Text>
                </TouchableOpacity>
              )}

              {isClosed && item.closureNotice ? (
                <View style={styles.closureNoticeBox}>
                  <AlertTriangle size={14} color="#f87171" />
                  <Text style={styles.closureNoticeText}>{item.closureNotice}</Text>
                </View>
              ) : null}

              <View style={styles.sportsRow}>
                {item.sports?.map((s, i) => (
                  <View key={i} style={styles.sportBadge}>
                    <Text style={styles.sportText}>{s}</Text>
                  </View>
                ))}
              </View>

              {/* Sponsored / Featured Turf Ranking Card */}
              <View
                style={{
                  backgroundColor: item.isFeatured ? 'rgba(245, 158, 11, 0.12)' : 'rgba(30, 41, 59, 0.5)',
                  borderColor: item.isFeatured ? 'rgba(245, 158, 11, 0.4)' : '#334155',
                  borderWidth: 1,
                  borderRadius: 12,
                  padding: 10,
                  marginVertical: 6,
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <View style={{ flex: 1, marginRight: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Sparkles size={14} color={item.isFeatured ? '#fbbf24' : '#94a3b8'} />
                    <Text
                      style={{
                        color: item.isFeatured ? '#fbbf24' : '#cbd5e1',
                        fontSize: 12,
                        fontWeight: '800',
                      }}
                    >
                      {item.isFeatured ? '⭐ FEATURED SPONSORED VENUE' : 'Sponsored Ranking Boost'}
                    </Text>
                  </View>
                  <Text style={{ color: '#94a3b8', fontSize: 10, marginTop: 2 }}>
                    {item.isFeatured
                      ? 'Ranked at top of player searches with verified gold badge'
                      : 'Boost to #1 search position & display sponsored badge'}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: item.isFeatured ? '#475569' : '#f59e0b',
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 8,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                  disabled={togglingFeaturedId === item.id}
                  onPress={() => handleToggleFeaturedTurf(item)}
                >
                  {togglingFeaturedId === item.id ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text
                      style={{
                        color: item.isFeatured ? '#ffffff' : '#000000',
                        fontSize: 11,
                        fontWeight: '900',
                      }}
                    >
                      {item.isFeatured ? 'Deactivate' : 'Boost ⭐'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              {/* Venue Management & Action Controls Row */}
              <View style={styles.actionControlsRow}>
                <TouchableOpacity
                  style={styles.editTurfBtn}
                  onPress={() => openEditTurfModal(item)}
                >
                  <Edit2 size={13} color="#38bdf8" />
                  <Text style={styles.editTurfBtnText}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteTurfBtn}
                  onPress={() => handleDeleteTurf(item)}
                >
                  <Trash2 size={13} color="#f87171" />
                  <Text style={styles.deleteTurfBtnText}>Delete</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionBtn, isClosed ? styles.reopenBtn : styles.closeBtn]}
                  onPress={() => handleToggleTurfClosure(item)}
                >
                  <Power size={13} color={isClosed ? '#10b981' : '#ef4444'} />
                  <Text style={[styles.actionBtnText, isClosed ? styles.reopenBtnText : styles.closeBtnText]}>
                    {isClosed ? 'Reopen' : 'Closure'}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addPitchQuickBtn}
                  onPress={() => openAddArenaModal(item)}
                >
                  <Plus size={13} color="#10b981" />
                  <Text style={styles.addPitchQuickText}>+ Pitch</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addGamingQuickBtn}
                  onPress={() => openAddGamingZoneModal(item)}
                >
                  <Gamepad2 size={13} color="#a78bfa" />
                  <Text style={styles.addGamingQuickText}>+ Gaming Zone</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.expandPitchesBtn}
                  onPress={() => setExpandedTurfId(isExpanded ? null : item.id)}
                >
                  <Text style={styles.expandPitchesText}>
                    {arenas.length} Arenas
                  </Text>
                  {isExpanded ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
                </TouchableOpacity>
              </View>

              {/* Expanded Arenas / Pitches List with Maintenance Toggles, Edit, & Delete */}
              {isExpanded && (
                <View style={styles.pitchesContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 6 }}>
                    <Text style={styles.pitchesTitle}>Arenas & Gaming Stations ({arenas.length})</Text>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.addPitchHeaderBtn}
                        onPress={() => openAddArenaModal(item)}
                      >
                        <Plus size={12} color="#064e3b" />
                        <Text style={styles.addPitchHeaderBtnText}>+ Add Pitch</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.addGamingHeaderBtn}
                        onPress={() => openAddGamingZoneModal(item)}
                      >
                        <Gamepad2 size={12} color="#ffffff" />
                        <Text style={styles.addGamingHeaderBtnText}>+ Add Gaming Zone</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {arenas.length === 0 && (
                    <View style={{ gap: 8, marginBottom: 8 }}>
                      <TouchableOpacity
                        style={styles.emptyPitchPrompt}
                        onPress={() => openAddArenaModal(item)}
                      >
                        <Plus size={15} color="#38bdf8" />
                        <Text style={styles.emptyPitchPromptText}>No pitches added yet. Tap to create Pitch A.</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.emptyPitchPrompt, { borderColor: 'rgba(139, 92, 246, 0.4)' }]}
                        onPress={() => openAddGamingZoneModal(item)}
                      >
                        <Gamepad2 size={15} color="#a78bfa" />
                        <Text style={[styles.emptyPitchPromptText, { color: '#a78bfa' }]}>+ Add Gaming Zone (Pool, TT, Carrom, PS5)</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {arenas.map((arena) => (
                    <View key={arena.id} style={styles.pitchRow}>
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Text style={styles.pitchName}>{arena.name}</Text>
                          {arena.facilityType === 'INDOOR_GAME' && (
                            <View style={styles.indoorStationBadge}>
                              <Text style={styles.indoorStationBadgeText}>🎮 GAMING STATION</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pitchSport}>
                          {arena.sports && arena.sports.length > 1
                            ? `⚡ Multi-Sport (${arena.sports.join(' • ')})`
                            : arena.sport} • Pitch Price: ₹{arena.pricePerSlot || item.basePrice}
                        </Text>
                        {arena.isUnderMaintenance && (
                          <Text style={styles.pitchMaintReason}>
                            ⚠️ {arena.maintenanceReason || 'Under maintenance'}
                          </Text>
                        )}
                      </View>

                      <View style={styles.pitchActionsRow}>
                        <TouchableOpacity
                          style={styles.pitchEditBtn}
                          onPress={() => openEditArenaModal(arena)}
                        >
                          <Edit2 size={12} color="#38bdf8" />
                          <Text style={styles.pitchEditBtnText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.pitchDeleteBtn}
                          onPress={() => handleDeleteArena(arena)}
                        >
                          <Trash2 size={12} color="#f87171" />
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.maintToggleBtn,
                            arena.isUnderMaintenance ? styles.maintActiveBtn : styles.maintOffBtn,
                          ]}
                          onPress={() => handleToggleArenaMaintenance(arena)}
                        >
                          <Wrench size={11} color={arena.isUnderMaintenance ? '#ef4444' : '#10b981'} />
                          <Text
                            style={[
                              styles.maintBtnText,
                              arena.isUnderMaintenance ? styles.maintActiveText : styles.maintOffText,
                            ]}
                          >
                            {arena.isUnderMaintenance ? 'Maint' : 'Active'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}

                  <TouchableOpacity
                    style={styles.addAnotherPitchBtn}
                    onPress={() => openAddArenaModal(item)}
                    activeOpacity={0.8}
                  >
                    <Plus size={13} color="#38bdf8" />
                    <Text style={styles.addAnotherPitchText}>+ Add Another Pitch / Court (e.g. 7v7, Box Cricket)</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Building size={40} color="#64748b" />
            <Text style={styles.emptyTitle}>No Turfs Added</Text>
            <Text style={styles.emptyDesc}>Register your first sports venue to start accepting bookings.</Text>
          </View>
        }
      />

      {/* Floating Action Buttons for Owner: Add Gaming Zone & Add Arena */}
      <View style={styles.fabRow}>
        <TouchableOpacity
          style={[styles.fabBtn, styles.fabGamingBtn]}
          onPress={() => {
            if (turfs.length === 0) {
              Alert.alert(
                'Register Venue First',
                'Please register your sports venue or complex first before adding an indoor gaming zone station.'
              );
              setShowModal(true);
            } else if (turfs.length === 1) {
              openAddGamingZoneModal(turfs[0]);
            } else {
              Alert.alert(
                'Add Gaming Zone',
                'Select the venue to add a Gaming Zone station to:',
                [
                  ...turfs.map((t) => ({
                    text: t.name,
                    onPress: () => openAddGamingZoneModal(t),
                  })),
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }
          }}
          activeOpacity={0.85}
        >
          <Gamepad2 size={17} color="#ffffff" />
          <Text style={styles.fabGamingText}>+ Gaming Zone</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.fabBtn, styles.fabArenaBtn]}
          onPress={() => {
            if (turfs.length === 0) {
              setShowModal(true);
            } else if (turfs.length === 1) {
              openAddArenaModal(turfs[0]);
            } else {
              Alert.alert(
                'Add Arena / Pitch',
                'Choose what you would like to add:',
                [
                  ...turfs.map((t) => ({
                    text: `+ Pitch to ${t.name}`,
                    onPress: () => openAddArenaModal(t),
                  })),
                  { text: '+ Register New Sports Complex', onPress: () => setShowModal(true) },
                  { text: 'Cancel', style: 'cancel' },
                ]
              );
            }
          }}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#064e3b" />
          <Text style={styles.fabText}>Add Arena</Text>
        </TouchableOpacity>
      </View>

      {/* Closure Notice Modal */}
      <Modal visible={!!closureModalTurf} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Temporary Turf Closure</Text>
              <TouchableOpacity onPress={() => setClosureModalTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Closure Reason (Internal / Ledger)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Annual Monsoon turf turfing & LED light upgrade"
              placeholderTextColor="#64748b"
              value={closureReason}
              onChangeText={setClosureReason}
            />

            <Text style={styles.label}>Public Notice for Players</Text>
            <TextInput
              style={[styles.input, { height: 70, paddingTop: 10, textAlignVertical: 'top' }]}
              multiline
              numberOfLines={3}
              placeholder="e.g. Ground closed until Friday for scheduled turf resurfacing. Bookings resume this weekend!"
              placeholderTextColor="#64748b"
              value={closureNotice}
              onChangeText={setClosureNotice}
            />

            <TouchableOpacity
              style={[styles.closeConfirmBtn, savingClosure && styles.disabledBtn]}
              onPress={handleConfirmClosure}
              disabled={savingClosure}
            >
              {savingClosure ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={styles.closeConfirmBtnText}>Confirm Venue Closure</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Verification Documents Upload Modal */}
      <Modal visible={!!verificationModalTurf} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Turf Verification Documents</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  {verificationModalTurf?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setVerificationModalTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
              <Text style={styles.label}>Document Category</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                {[
                  { id: 'BUSINESS_REGISTRATION', label: 'Business Registration / MSME' },
                  { id: 'GST_CERTIFICATE', label: 'GST Certificate' },
                  { id: 'LEASE_AGREEMENT', label: 'Lease Agreement / Land Proof' },
                  { id: 'ELECTRICITY_BILL', label: 'Electricity / Utility Bill' },
                  { id: 'OWNER_ID_PROOF', label: 'Owner ID (Aadhaar/PAN)' },
                  { id: 'TURF_SIGNBOARD_PHOTO', label: 'Entrance / Signboard Photo' },
                  { id: 'GEO_TAGGED_PHOTO', label: 'Geotagged Ground Photo' },
                ].map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setDocType(cat.id as DocumentType)}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 6,
                      borderRadius: 8,
                      backgroundColor: docType === cat.id ? '#4f46e5' : '#1e293b',
                      borderWidth: 1,
                      borderColor: docType === cat.id ? '#818cf8' : '#334155',
                    }}
                  >
                    <Text style={{ color: docType === cat.id ? '#ffffff' : '#94a3b8', fontSize: 10, fontWeight: '700' }}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Document Title / File Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. MSME Registration 2026.pdf"
                placeholderTextColor="#64748b"
                value={docName}
                onChangeText={setDocName}
              />

              <Text style={styles.label}>File Link / Cloud Storage Reference</Text>
              <TextInput
                style={styles.input}
                placeholder="https://trufit-storage.appspot.com/docs/... or drive url"
                placeholderTextColor="#64748b"
                value={docUrl}
                onChangeText={setDocUrl}
              />

              {/* Already uploaded docs list */}
              {verificationModalTurf && (turfDocs[verificationModalTurf.id] || []).length > 0 && (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: '#cbd5e1', fontSize: 12, fontWeight: '700', marginBottom: 6 }}>
                    Uploaded Documents ({(turfDocs[verificationModalTurf.id] || []).length})
                  </Text>
                  {(turfDocs[verificationModalTurf.id] || []).map((doc) => (
                    <View
                      key={doc.id}
                      style={{
                        backgroundColor: '#090d16',
                        padding: 8,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: '#1e293b',
                        marginBottom: 6,
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#ffffff', fontSize: 11, fontWeight: '700' }}>
                          {doc.documentName}
                        </Text>
                        <Text style={{ color: '#64748b', fontSize: 10 }}>
                          {String(doc.documentType || 'document').replace(/_/g, ' ')} • {String(doc.verificationStatus || 'PENDING')}
                        </Text>
                      </View>
                      <View
                        style={{
                          backgroundColor:
                            doc.verificationStatus === 'APPROVED'
                              ? '#064e3b'
                              : doc.verificationStatus === 'REJECTED'
                              ? '#7f1d1d'
                              : '#312e81',
                          paddingHorizontal: 6,
                          paddingVertical: 3,
                          borderRadius: 4,
                        }}
                      >
                        <Text style={{ color: '#ffffff', fontSize: 9, fontWeight: '800' }}>
                          {doc.verificationStatus}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.closeConfirmBtn,
                  { backgroundColor: '#4f46e5', marginTop: 12 },
                  uploadingDoc && styles.disabledBtn,
                ]}
                onPress={handleUploadDoc}
                disabled={uploadingDoc}
              >
                {uploadingDoc ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.closeConfirmBtnText}>Upload & Attach Document</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Turf Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Register New Arena Ground</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <Text style={styles.label}>Venue Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. KickOff AstroTurf Arena"
                placeholderTextColor="#64748b"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.label}>Venue Description & Ground Features</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Describe turf specifications, infill type, LED floodlights, viewing gallery, footwear rules..."
                placeholderTextColor="#64748b"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Full Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Link Road, Next to Sports Complex"
                placeholderTextColor="#64748b"
                value={address}
                onChangeText={setAddress}
              />

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Area / Neighborhood</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Bandra West"
                    placeholderTextColor="#64748b"
                    value={area}
                    onChangeText={setArea}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: '#38bdf8' }]}>City (Compulsory) *</Text>
                  <TextInput
                    style={[styles.input, !city.trim() && { borderColor: '#f59e0b' }]}
                    placeholder="e.g. Mumbai, Delhi, Bangalore"
                    placeholderTextColor="#64748b"
                    value={city}
                    onChangeText={setCity}
                  />
                </View>
              </View>

              {/* Compulsory Location Link */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.label, { color: '#38bdf8' }]}>Google Maps Location Link (Compulsory) *</Text>
                  {locationUrl.trim() ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(locationUrl.trim())}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700' }}>Test Link</Text>
                      <ExternalLink size={11} color="#38bdf8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TextInput
                  style={[styles.input, !locationUrl.trim() && { borderColor: '#f59e0b' }]}
                  placeholder="https://maps.google.com/?q=... or https://maps.app.goo.gl/..."
                  placeholderTextColor="#64748b"
                  value={locationUrl}
                  onChangeText={setLocationUrl}
                  autoCapitalize="none"
                />
                <Text style={styles.hintText}>
                  Compulsory: direct destination pin for player directions and "View on Map".
                </Text>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Base Price / Slot (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={basePrice}
                    onChangeText={setBasePrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Desk Contact Phone</Text>
                  <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Opening Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="06:00"
                    placeholderTextColor="#64748b"
                    value={openingTime}
                    onChangeText={setOpeningTime}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Closing Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="23:00"
                    placeholderTextColor="#64748b"
                    value={closingTime}
                    onChangeText={setClosingTime}
                  />
                </View>
              </View>

              <Text style={styles.label}>Supported Sports</Text>
              <View style={styles.sportsGrid}>
                {sportsOptions.map((sport) => {
                  const isSelected = selectedSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportSelectChip, isSelected && styles.sportSelectChipActive]}
                      onPress={() => toggleSport(sport)}
                    >
                      <Text style={[styles.sportSelectText, isSelected && styles.sportSelectTextActive]}>
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Facilities & Amenities</Text>
              <View style={styles.sportsGrid}>
                {AMENITY_OPTIONS.map((amenity) => {
                  const isSelected = facilities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.amenityChip, isSelected && styles.amenityChipActive]}
                      onPress={() => toggleAmenity(amenity, false)}
                    >
                      <Text style={[styles.amenityText, isSelected && styles.amenityTextActive]}>
                        {isSelected ? '✓ ' : '+ '}{amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Photos Management Section with Gallery, Camera & Presets */}
              <View style={styles.photoSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>Venue Photos ({photos.length})</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={() => handleLaunchCamera(false)}
                    >
                      <Camera size={13} color="#10b981" />
                      <Text style={styles.pickPhotoBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={() => handlePickPhotos(false)}
                    >
                      <ImageIcon size={13} color="#38bdf8" />
                      <Text style={[styles.pickPhotoBtnText, { color: '#38bdf8' }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Genuine Photos Notice */}
                <View style={styles.realPhotosNoticeBanner}>
                  <ShieldCheck size={14} color="#10b981" />
                  <Text style={styles.realPhotosNoticeText}>
                    Athletes book genuine grounds. Upload real photos of your turf, lighting, and nets. No stock images allowed.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Or paste image URL (https://...)"
                    placeholderTextColor="#64748b"
                    value={photoInputUrl}
                    onChangeText={setPhotoInputUrl}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.addUrlBtn}
                    onPress={() => handleAddPhotoUrl(false)}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {photos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
                    {photos.map((uri, idx) => (
                      <View key={idx} style={styles.photoThumbWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {idx === 0 ? (
                          <View style={styles.coverPill}>
                            <Text style={styles.coverPillText}>★ COVER</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.makeCoverBtn}
                            onPress={() => handleSetCoverPhoto(idx, false)}
                          >
                            <Text style={styles.makeCoverText}>Set Cover</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(idx, false)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.multiPitchTipCard}>
                <Sparkles size={14} color="#38bdf8" />
                <Text style={styles.multiPitchTipText}>
                  Multi-Pitch Facility: Pitch A is created automatically. You can add more pitches (Pitch B, Box Cricket, 7v7 Turf, Badminton Court) with unique pricing & capacities at any time using the "+ Pitch" button on your venue card.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.createBtn, creating && styles.disabledBtn]}
                onPress={handleCreateTurf}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Save & Create Venue</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Turf Modal */}
      <Modal visible={!!editingTurf} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Venue Details</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>
                  {editingTurf?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              <Text style={styles.label}>Venue Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Venue Name"
                placeholderTextColor="#64748b"
                value={editName}
                onChangeText={setEditName}
              />

              <Text style={styles.label}>Venue Description & Ground Features</Text>
              <TextInput
                style={[styles.input, { height: 72, textAlignVertical: 'top', paddingTop: 8 }]}
                placeholder="Describe turf specifications, infill type, LED floodlights, viewing gallery, footwear rules..."
                placeholderTextColor="#64748b"
                value={editDescription}
                onChangeText={setEditDescription}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.label}>Full Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Address"
                placeholderTextColor="#64748b"
                value={editAddress}
                onChangeText={setEditAddress}
              />

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Area / Neighborhood</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Area"
                    placeholderTextColor="#64748b"
                    value={editArea}
                    onChangeText={setEditArea}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: '#38bdf8' }]}>City (Compulsory) *</Text>
                  <TextInput
                    style={[styles.input, !editCity.trim() && { borderColor: '#f59e0b' }]}
                    placeholder="City"
                    placeholderTextColor="#64748b"
                    value={editCity}
                    onChangeText={setEditCity}
                  />
                </View>
              </View>

              {/* Compulsory Location Link */}
              <View style={{ marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={[styles.label, { color: '#38bdf8' }]}>Google Maps Location Link (Compulsory) *</Text>
                  {editLocationUrl.trim() ? (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(editLocationUrl.trim())}
                      style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                    >
                      <Text style={{ color: '#38bdf8', fontSize: 10, fontWeight: '700' }}>Test Link</Text>
                      <ExternalLink size={11} color="#38bdf8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <TextInput
                  style={[styles.input, !editLocationUrl.trim() && { borderColor: '#f59e0b' }]}
                  placeholder="https://maps.google.com/?q=... or https://maps.app.goo.gl/..."
                  placeholderTextColor="#64748b"
                  value={editLocationUrl}
                  onChangeText={setEditLocationUrl}
                  autoCapitalize="none"
                />
                <Text style={styles.hintText}>
                  Compulsory for players: opens directly when they tap "View on Map" or "Get Directions".
                </Text>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Base Price / Slot (₹)</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={editBasePrice}
                    onChangeText={setEditBasePrice}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Desk Contact Phone</Text>
                  <TextInput style={styles.input} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" />
                </View>
              </View>

              <View style={styles.rowTwo}>
                <View style={styles.col}>
                  <Text style={styles.label}>Opening Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="06:00"
                    placeholderTextColor="#64748b"
                    value={editOpeningTime}
                    onChangeText={setEditOpeningTime}
                  />
                </View>
                <View style={styles.col}>
                  <Text style={styles.label}>Closing Time</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="23:00"
                    placeholderTextColor="#64748b"
                    value={editClosingTime}
                    onChangeText={setEditClosingTime}
                  />
                </View>
              </View>

              <Text style={styles.label}>Supported Sports</Text>
              <View style={styles.sportsGrid}>
                {sportsOptions.map((sport) => {
                  const isSelected = editSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportSelectChip, isSelected && styles.sportSelectChipActive]}
                      onPress={() => toggleSport(sport, true)}
                    >
                      <Text style={[styles.sportSelectText, isSelected && styles.sportSelectTextActive]}>
                        {sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Facilities & Amenities</Text>
              <View style={styles.sportsGrid}>
                {AMENITY_OPTIONS.map((amenity) => {
                  const isSelected = editFacilities.includes(amenity);
                  return (
                    <TouchableOpacity
                      key={amenity}
                      style={[styles.amenityChip, isSelected && styles.amenityChipActive]}
                      onPress={() => toggleAmenity(amenity, true)}
                    >
                      <Text style={[styles.amenityText, isSelected && styles.amenityTextActive]}>
                        {isSelected ? '✓ ' : '+ '}{amenity}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Photos Management Section */}
              <View style={styles.photoSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>Venue Photos ({editPhotos.length})</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={() => handleLaunchCamera(true)}
                    >
                      <Camera size={13} color="#10b981" />
                      <Text style={styles.pickPhotoBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={() => handlePickPhotos(true)}
                    >
                      <ImageIcon size={13} color="#38bdf8" />
                      <Text style={[styles.pickPhotoBtnText, { color: '#38bdf8' }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Genuine Photos Notice */}
                <View style={styles.realPhotosNoticeBanner}>
                  <ShieldCheck size={14} color="#10b981" />
                  <Text style={styles.realPhotosNoticeText}>
                    Athletes book genuine grounds. Upload real photos of your turf, lighting, and nets. No stock images allowed.
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Or paste image URL (https://...)"
                    placeholderTextColor="#64748b"
                    value={editPhotoInputUrl}
                    onChangeText={setEditPhotoInputUrl}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.addUrlBtn}
                    onPress={() => handleAddPhotoUrl(true)}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {editPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
                    {editPhotos.map((uri, idx) => (
                      <View key={idx} style={styles.photoThumbWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {idx === 0 ? (
                          <View style={styles.coverPill}>
                            <Text style={styles.coverPillText}>★ COVER</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.makeCoverBtn}
                            onPress={() => handleSetCoverPhoto(idx, true)}
                          >
                            <Text style={styles.makeCoverText}>Set Cover</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemovePhoto(idx, true)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, savingEdit && styles.disabledBtn]}
                onPress={handleSaveEditTurf}
                disabled={savingEdit}
              >
                {savingEdit ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Edit Arena / Pitch Modal */}
      <Modal visible={!!editingArena} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit Pitch / Court</Text>
                <Text style={{ color: '#94a3b8', fontSize: 11 }}>{editingArena?.name}</Text>
              </View>
              <TouchableOpacity onPress={() => setEditingArena(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>Pitch / Court Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Pitch A (Main Arena) or Court 1"
                placeholderTextColor="#64748b"
                value={editArenaName}
                onChangeText={setEditArenaName}
              />

              <Text style={styles.label}>Supported Sports (Multi-Select)</Text>
              <Text style={styles.subLabel}>Tap all sports playable on this pitch (e.g. Football + Cricket share the same turf schedule)</Text>
              <View style={styles.sportsGrid}>
                {sportsOptions.map((sport) => {
                  const isSelected = editArenaSports.includes(sport);
                  return (
                    <TouchableOpacity
                      key={sport}
                      style={[styles.sportSelectChip, isSelected && styles.sportSelectChipActive]}
                      onPress={() => toggleEditArenaSport(sport)}
                    >
                      <Text style={[styles.sportSelectText, isSelected && styles.sportSelectTextActive]}>
                        {isSelected ? '✓ ' : ''}{sport}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {editArenaSports.length > 1 && (
                <View style={styles.multiSportNoticeBox}>
                  <Text style={styles.multiSportNoticeText}>
                    ⚡ Multi-Sport Enabled: Players can book either {editArenaSports.join(' or ')}. A slot booked for any sport blocks the physical ground for all sports.
                  </Text>
                </View>
              )}

              <Text style={styles.label}>Pitch Price (₹)</Text>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                placeholder="1500"
                placeholderTextColor="#64748b"
                value={editArenaPrice}
                onChangeText={setEditArenaPrice}
              />

              {/* Pitch / Station Photos Management Section */}
              <View style={styles.photoSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>Station / Pitch Photos ({editArenaPhotos.length})</Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={handleLaunchEditArenaCamera}
                    >
                      <Camera size={13} color="#10b981" />
                      <Text style={styles.pickPhotoBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={handlePickEditArenaPhotos}
                    >
                      <ImageIcon size={13} color="#38bdf8" />
                      <Text style={[styles.pickPhotoBtnText, { color: '#38bdf8' }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Or paste photo URL (https://...)"
                    placeholderTextColor="#64748b"
                    value={editArenaPhotoInputUrl}
                    onChangeText={setEditArenaPhotoInputUrl}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.addUrlBtn}
                    onPress={handleAddEditArenaPhotoUrl}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {editArenaPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
                    {editArenaPhotos.map((uri, idx) => (
                      <View key={idx} style={styles.photoThumbWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {idx === 0 ? (
                          <View style={styles.coverPill}>
                            <Text style={styles.coverPillText}>★ COVER</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.makeCoverBtn}
                            onPress={() => handleSetCoverEditArenaPhoto(idx)}
                          >
                            <Text style={styles.makeCoverText}>Set Cover</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemoveEditArenaPhoto(idx)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, savingArenaEdit && styles.disabledBtn]}
                onPress={handleSaveEditArena}
                disabled={savingArenaEdit}
              >
                {savingArenaEdit ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>Save Pitch Details</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add New Arena / Pitch Modal */}
      <Modal visible={!!addingArenaTurf} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {newFacilityType === 'INDOOR_GAME'
                    ? 'Add Arena: Gaming Zone (Indoor)'
                    : 'Add Arena: Turf (Outdoor)'}
                </Text>
                <Text style={{ color: '#94a3b8', fontSize: 11, marginTop: 2 }}>
                  Adding to: {addingArenaTurf?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAddingArenaTurf(null)}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Facility Type Selector: Ask Owner if Turf (Outdoor) or Gaming Zone (Indoor) */}
              <View style={styles.facilityPromptBox}>
                <Text style={styles.facilityPromptTitle}>Is this arena a Turf or Gaming Zone?</Text>
                <Text style={styles.facilityPromptSub}>
                  Select whether you are adding an outdoor sports pitch or an indoor gaming zone station.
                </Text>
              </View>

              <View style={styles.facilityTypeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.facilityTypeToggleBtn,
                    newFacilityType === 'OUTDOOR_TURF' && styles.facilityTypeToggleBtnActive,
                  ]}
                  onPress={() => {
                    setNewFacilityType('OUTDOOR_TURF');
                    setNewArenaName('Pitch B');
                    setNewArenaPrice('1500');
                    setNewArenaCapacity('14');
                  }}
                >
                  <Text
                    style={[
                      styles.facilityTypeToggleText,
                      newFacilityType === 'OUTDOOR_TURF' && styles.facilityTypeToggleTextActive,
                    ]}
                  >
                    🌿 Turf (Outdoor)
                  </Text>
                  <Text style={styles.facilityTypeSubLabel}>Football, Cricket, Badminton</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.facilityTypeToggleBtn,
                    newFacilityType === 'INDOOR_GAME' && styles.facilityTypeToggleBtnGamingActive,
                  ]}
                  onPress={() => {
                    setNewFacilityType('INDOOR_GAME');
                    handleSelectIndoorGame('Pool');
                  }}
                >
                  <Text
                    style={[
                      styles.facilityTypeToggleText,
                      newFacilityType === 'INDOOR_GAME' && styles.facilityTypeToggleTextActive,
                    ]}
                  >
                    🎮 Gaming Zone (Indoor)
                  </Text>
                  <Text style={styles.facilityTypeSubLabel}>Pool, TT, Carrom, PS5</Text>
                </TouchableOpacity>
              </View>

              {newFacilityType === 'INDOOR_GAME' ? (
                <>
                  <Text style={styles.label}>Select Game / Station Type *</Text>
                  <View style={styles.sportsGrid}>
                    {INDOOR_GAME_OPTIONS.map((g) => {
                      const isSelected = newIndoorGame === g.id;
                      return (
                        <TouchableOpacity
                          key={g.id}
                          style={[
                            styles.sportSelectChip,
                            isSelected && styles.indoorSelectChipActive,
                          ]}
                          onPress={() => handleSelectIndoorGame(g.id)}
                        >
                          <Text
                            style={[
                              styles.sportSelectText,
                              isSelected && styles.sportSelectTextActive,
                            ]}
                          >
                            {g.icon} {g.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Custom Game Configuration Card */}
                  {newIndoorGame === 'CUSTOM' && (
                    <View style={styles.customGameCard}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Sparkles size={15} color="#38bdf8" />
                        <Text style={styles.customGameCardTitle}>Custom / Unlisted Game Setup</Text>
                      </View>
                      <Text style={styles.subLabel}>
                        Enter any game or entertainment station not listed above (e.g. Virtual Reality, Steel Tip Darts, Chess, Air Hockey, Laser Tag, Bowling).
                      </Text>

                      <Text style={[styles.label, { marginTop: 10 }]}>Custom Game Name *</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="e.g. Virtual Reality (VR) Pod, Darts Lounge"
                        placeholderTextColor="#64748b"
                        value={newCustomGameName}
                        onChangeText={(text) => {
                          setNewCustomGameName(text);
                          if (!newArenaName || newArenaName.startsWith('Gaming Station') || newArenaName.startsWith('Custom')) {
                            setNewArenaName(`${text.trim() || 'Custom'} Station 1`);
                          }
                        }}
                      />

                      <Text style={styles.label}>Game Icon / Emoji</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                        {CUSTOM_GAME_EMOJIS.map((emoji) => (
                          <TouchableOpacity
                            key={emoji}
                            style={[
                              styles.emojiChip,
                              newCustomGameIcon === emoji && styles.emojiChipActive,
                            ]}
                            onPress={() => setNewCustomGameIcon(emoji)}
                          >
                            <Text style={{ fontSize: 18 }}>{emoji}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      <Text style={styles.label}>Add Custom Equipment / Gear</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                        <TextInput
                          style={[styles.input, { flex: 1, marginBottom: 0 }]}
                          placeholder="e.g. 2 Wireless VR Headsets, Steel Darts"
                          placeholderTextColor="#64748b"
                          value={newCustomEquipInput}
                          onChangeText={setNewCustomEquipInput}
                        />
                        <TouchableOpacity
                          style={styles.addUrlBtn}
                          onPress={handleAddCustomEquipTag}
                        >
                          <Plus size={16} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}

                  <Text style={styles.label}>Station / Table / Board Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Table #1 (8-Ball Pool) or Board A"
                    placeholderTextColor="#64748b"
                    value={newArenaName}
                    onChangeText={setNewArenaName}
                  />

                  <View style={{ flexDirection: 'row', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Hourly Rate (₹) *</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="200"
                        placeholderTextColor="#64748b"
                        value={newArenaPrice}
                        onChangeText={setNewArenaPrice}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.label}>Max Players</Text>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="4"
                        placeholderTextColor="#64748b"
                        value={newArenaCapacity}
                        onChangeText={setNewArenaCapacity}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Slot Duration Option</Text>
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                    <TouchableOpacity
                      style={[
                        styles.durationChip,
                        newSlotDuration === 30 && styles.durationChipActive,
                      ]}
                      onPress={() => setNewSlotDuration(30)}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          newSlotDuration === 30 && styles.durationChipTextActive,
                        ]}
                      >
                        ⏱️ 30 Min Slots
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.durationChip,
                        newSlotDuration === 60 && styles.durationChipActive,
                      ]}
                      onPress={() => setNewSlotDuration(60)}
                    >
                      <Text
                        style={[
                          styles.durationChipText,
                          newSlotDuration === 60 && styles.durationChipTextActive,
                        ]}
                      >
                        ⏱️ 60 Min (1 Hr) Slots
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.label}>Included Equipment Checklist</Text>
                  <View style={styles.sportsGrid}>
                    {INDOOR_EQUIPMENT_TAGS.map((tag) => {
                      const isSelected = newIndoorEquip.includes(tag);
                      return (
                        <TouchableOpacity
                          key={tag}
                          style={[
                            styles.sportSelectChip,
                            isSelected && styles.indoorSelectChipActive,
                          ]}
                          onPress={() => toggleIndoorEquipTag(tag)}
                        >
                          <Text
                            style={[
                              styles.sportSelectText,
                              isSelected && styles.sportSelectTextActive,
                            ]}
                          >
                            {isSelected ? '✓ ' : '+ '}
                            {tag}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Station Amenities</Text>
                  <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={[
                        styles.amenityToggleChip,
                        newHasAC && styles.amenityToggleChipActive,
                      ]}
                      onPress={() => setNewHasAC(!newHasAC)}
                    >
                      <Text style={styles.amenityToggleText}>
                        {newHasAC ? '✓ ' : ''}❄️ Air Conditioned
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.amenityToggleChip,
                        newHasLounge && styles.amenityToggleChipActive,
                      ]}
                      onPress={() => setNewHasLounge(!newHasLounge)}
                    >
                      <Text style={styles.amenityToggleText}>
                        {newHasLounge ? '✓ ' : ''}🛋️ Sofa Lounge
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.label}>Pitch / Court Name *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Pitch B (7v7), Box Cricket, Court 2"
                    placeholderTextColor="#64748b"
                    value={newArenaName}
                    onChangeText={setNewArenaName}
                  />

                  <Text style={styles.label}>Supported Sports (Multi-Select) *</Text>
                  <Text style={styles.subLabel}>
                    Tap all sports playable on this pitch (e.g. Football + Cricket share the same turf schedule)
                  </Text>
                  <View style={styles.sportsGrid}>
                    {sportsOptions.map((sport) => {
                      const isSelected = newArenaSports.includes(sport);
                      return (
                        <TouchableOpacity
                          key={sport}
                          style={[
                            styles.sportSelectChip,
                            isSelected && styles.sportSelectChipActive,
                          ]}
                          onPress={() => toggleNewArenaSport(sport)}
                        >
                          <Text
                            style={[
                              styles.sportSelectText,
                              isSelected && styles.sportSelectTextActive,
                            ]}
                          >
                            {isSelected ? '✓ ' : ''}
                            {sport}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {newArenaSports.length > 1 && (
                    <View style={styles.multiSportNoticeBox}>
                      <Text style={styles.multiSportNoticeText}>
                        ⚡ Multi-Sport Enabled: Players can book either {newArenaSports.join(' or ')}. A slot booked for any sport blocks the physical ground for all sports.
                      </Text>
                    </View>
                  )}

                  <Text style={styles.label}>Pitch Price (₹) *</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="1500"
                    placeholderTextColor="#64748b"
                    value={newArenaPrice}
                    onChangeText={setNewArenaPrice}
                  />

                  <Text style={styles.label}>
                    Max Player Capacity (e.g. 10 for 5v5, 14 for 7v7)
                  </Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    placeholder="14"
                    placeholderTextColor="#64748b"
                    value={newArenaCapacity}
                    onChangeText={setNewArenaCapacity}
                  />
                </>
              )}

              <Text style={styles.label}>Additional Details / Notes (Optional)</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                placeholder={
                  newFacilityType === 'INDOOR_GAME'
                    ? 'e.g. Wiraka 988 cloth, high-speed rails, chalk provided at counter'
                    : 'e.g. FIFA-certified astroturf, 50x30m box with floodlights'
                }
                placeholderTextColor="#64748b"
                multiline
                value={newArenaDesc}
                onChangeText={setNewArenaDesc}
              />

              {/* Station / Pitch Photos Management Section */}
              <View style={styles.photoSection}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text style={styles.label}>
                    {newFacilityType === 'INDOOR_GAME' ? 'Station Photos' : 'Pitch Photos'} ({newArenaPhotos.length})
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={handleLaunchArenaCamera}
                    >
                      <Camera size={13} color="#10b981" />
                      <Text style={styles.pickPhotoBtnText}>Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.pickPhotoBtn}
                      onPress={handlePickArenaPhotos}
                    >
                      <ImageIcon size={13} color="#38bdf8" />
                      <Text style={[styles.pickPhotoBtnText, { color: '#38bdf8' }]}>Gallery</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.realPhotosNoticeBanner}>
                  <ShieldCheck size={16} color="#10b981" />
                  <Text style={styles.realPhotosNoticeText}>
                    {newFacilityType === 'INDOOR_GAME'
                      ? 'Upload real photos of your table, cue rack, lounge chairs, or setup. Verified high-quality photos get 3x more bookings!'
                      : 'Upload actual pitch photos (grass condition, nets, lighting).'}
                  </Text>
                </View>

                {/* Optional curated preset photo quick-apply */}
                {newFacilityType === 'INDOOR_GAME' && GAME_DEFAULT_PHOTOS[newIndoorGame] && (
                  <View style={{ marginBottom: 10 }}>
                    <TouchableOpacity
                      style={styles.suggestedPhotoBtn}
                      onPress={() => handleUsePresetArenaPhoto(GAME_DEFAULT_PHOTOS[newIndoorGame])}
                    >
                      <Sparkles size={13} color="#38bdf8" />
                      <Text style={styles.suggestedPhotoBtnText}>
                        + Add Recommended High-Res {newIndoorGame === 'CUSTOM' ? 'HD' : newIndoorGame} Photo
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginBottom: 0 }]}
                    placeholder="Or paste photo URL (https://...)"
                    placeholderTextColor="#64748b"
                    value={newArenaPhotoInputUrl}
                    onChangeText={setNewArenaPhotoInputUrl}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity
                    style={styles.addUrlBtn}
                    onPress={handleAddArenaPhotoUrl}
                  >
                    <Plus size={16} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                {newArenaPhotos.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoThumbList}>
                    {newArenaPhotos.map((uri, idx) => (
                      <View key={idx} style={styles.photoThumbWrapper}>
                        <Image source={{ uri }} style={styles.photoThumb} />
                        {idx === 0 ? (
                          <View style={styles.coverPill}>
                            <Text style={styles.coverPillText}>★ COVER</Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            style={styles.makeCoverBtn}
                            onPress={() => handleSetCoverArenaPhoto(idx)}
                          >
                            <Text style={styles.makeCoverText}>Set Cover</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          style={styles.removePhotoBtn}
                          onPress={() => handleRemoveArenaPhoto(idx)}
                        >
                          <X size={12} color="#ffffff" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>

              <TouchableOpacity
                style={[styles.createBtn, savingNewArena && styles.disabledBtn]}
                onPress={handleCreateNewArena}
                disabled={savingNewArena}
              >
                {savingNewArena ? (
                  <ActivityIndicator color="#064e3b" />
                ) : (
                  <Text style={styles.createBtnText}>
                    {newFacilityType === 'INDOOR_GAME'
                      ? 'Add Table / Station to Gaming Zone'
                      : 'Add Pitch to Venue'}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
  listContent: {
    padding: 16,
    paddingBottom: 90,
  },
  headerBox: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
    lineHeight: 18,
  },
  turfCard: {
    backgroundColor: '#131b2e',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  turfCardClosed: {
    borderColor: 'rgba(239, 68, 68, 0.4)',
    backgroundColor: 'rgba(239, 68, 68, 0.03)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  turfIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  turfIconClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  turfInfo: {
    flex: 1,
  },
  turfName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#ffffff',
  },
  turfLocation: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  turfUpiText: {
    fontSize: 10,
    color: '#10b981',
    fontWeight: '700',
    marginTop: 2,
  },
  turfPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: '#10b981',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  statusBadgeActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusBadgeClosed: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  statusTextActive: {
    color: '#10b981',
  },
  statusTextClosed: {
    color: '#ef4444',
  },
  closureNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
  },
  closureNoticeText: {
    flex: 1,
    color: '#f87171',
    fontSize: 11,
    fontWeight: '600',
  },
  sportsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  sportBadge: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  sportText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  actionControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    paddingTop: 10,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  closeBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  reopenBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  actionBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  closeBtnText: {
    color: '#ef4444',
  },
  reopenBtnText: {
    color: '#10b981',
  },
  addPitchQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  addPitchQuickText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  addGamingQuickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.4)',
  },
  addGamingQuickText: {
    color: '#a78bfa',
    fontSize: 11,
    fontWeight: '800',
  },
  expandPitchesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  expandPitchesText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  pitchesContainer: {
    marginTop: 12,
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  pitchesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#cbd5e1',
  },
  addPitchHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#10b981',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addPitchHeaderBtnText: {
    color: '#064e3b',
    fontSize: 10,
    fontWeight: '800',
  },
  addGamingHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#8b5cf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  addGamingHeaderBtnText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyPitchPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#131b2e',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1e293b',
    borderStyle: 'dashed',
    marginBottom: 8,
  },
  emptyPitchPromptText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  addAnotherPitchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 10,
    marginTop: 10,
  },
  addAnotherPitchText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  pitchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  pitchName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  pitchSport: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  pitchMaintReason: {
    fontSize: 10,
    color: '#f87171',
    marginTop: 2,
  },
  maintToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  maintActiveBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  maintOffBtn: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  maintBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
  maintActiveText: {
    color: '#ef4444',
  },
  maintOffText: {
    color: '#10b981',
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#ffffff',
    marginTop: 12,
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#64748b',
  },
  fabRow: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
  fabGamingBtn: {
    backgroundColor: '#7c3aed',
    borderWidth: 1,
    borderColor: '#a78bfa',
  },
  fabArenaBtn: {
    backgroundColor: '#10b981',
  },
  fabGamingText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
  },
  fabText: {
    color: '#064e3b',
    fontSize: 13,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#131b2e',
    borderRadius: 20,
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
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    marginBottom: 6,
    marginTop: 6,
  },
  subLabel: {
    fontSize: 10,
    color: '#94a3b8',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#0b1120',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    color: '#ffffff',
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 10,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  sportSelectChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sportSelectChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  sportSelectText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  sportSelectTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  multiPitchTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 10,
    padding: 10,
    marginTop: 10,
    marginBottom: 6,
  },
  multiPitchTipText: {
    flex: 1,
    fontSize: 11,
    color: '#38bdf8',
    lineHeight: 16,
    fontWeight: '600',
  },
  multiSportNoticeBox: {
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  multiSportNoticeText: {
    fontSize: 11,
    color: '#38bdf8',
    lineHeight: 16,
    fontWeight: '600',
  },
  createBtn: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  closeConfirmBtn: {
    backgroundColor: '#ef4444',
    height: 46,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  closeConfirmBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '800',
  },
  disabledBtn: {
    opacity: 0.6,
  },
  cardPhotoSection: {
    marginBottom: 10,
  },
  cardPhotoScroll: {
    flexDirection: 'row',
  },
  cardPhotoWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  cardPhotoImg: {
    width: 120,
    height: 75,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  coverBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#065f46',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverBadgeText: {
    color: '#34d399',
    fontSize: 9,
    fontWeight: '800',
  },
  cardPhotoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  photoCountBadge: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '600',
  },
  cardManagePhotosBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  cardManagePhotosText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  noPhotosPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(56, 189, 248, 0.04)',
    marginBottom: 10,
  },
  noPhotosPromptText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  locationLinkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  locationLinkText: {
    flex: 1,
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  missingLocationBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  missingLocationText: {
    flex: 1,
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '600',
  },
  editTurfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editTurfBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
  deleteTurfBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteTurfBtnText: {
    color: '#ef4444',
    fontSize: 11,
    fontWeight: '700',
  },
  pitchActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pitchEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  pitchEditBtnText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  pitchDeleteBtn: {
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  hintText: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 3,
  },
  amenityChip: {
    backgroundColor: '#0b1120',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  amenityChipActive: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  amenityText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  amenityTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  photoSection: {
    backgroundColor: '#0b1120',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 12,
  },
  pickPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#131b2e',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  pickPhotoBtnText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  realPhotosNoticeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  realPhotosNoticeText: {
    flex: 1,
    color: '#6ee7b7',
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  addUrlBtn: {
    backgroundColor: '#4f46e5',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoThumbList: {
    flexDirection: 'row',
    marginTop: 8,
  },
  photoThumbWrapper: {
    position: 'relative',
    marginRight: 8,
  },
  photoThumb: {
    width: 80,
    height: 60,
    borderRadius: 8,
    backgroundColor: '#1e293b',
  },
  coverPill: {
    position: 'absolute',
    top: 3,
    left: 3,
    backgroundColor: '#065f46',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  coverPillText: {
    color: '#34d399',
    fontSize: 8,
    fontWeight: '800',
  },
  makeCoverBtn: {
    position: 'absolute',
    bottom: 3,
    left: 3,
    right: 3,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
  },
  makeCoverText: {
    color: '#38bdf8',
    fontSize: 8,
    fontWeight: '700',
  },
  removePhotoBtn: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createBtnText: {
    color: '#064e3b',
    fontSize: 14,
    fontWeight: '800',
  },
  facilityPromptBox: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  facilityPromptTitle: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 2,
  },
  facilityPromptSub: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 15,
  },
  facilityTypeSubLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  facilityTypeToggleRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  facilityTypeToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  facilityTypeToggleBtnActive: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#10b981',
  },
  facilityTypeToggleBtnGamingActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  facilityTypeToggleText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
  },
  facilityTypeToggleTextActive: {
    color: '#ffffff',
    fontWeight: '800',
  },
  indoorSelectChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  durationChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  durationChipActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#f59e0b',
  },
  durationChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
  },
  durationChipTextActive: {
    color: '#f59e0b',
    fontWeight: '800',
  },
  amenityToggleChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  amenityToggleChipActive: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#38bdf8',
  },
  amenityToggleText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '700',
  },
  indoorStationBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  indoorStationBadgeText: {
    color: '#f59e0b',
    fontSize: 9,
    fontWeight: '800',
  },
  customGameCard: {
    backgroundColor: 'rgba(56, 189, 248, 0.06)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    padding: 12,
    marginBottom: 14,
  },
  customGameCardTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
  },
  emojiChip: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#0b1120',
    borderWidth: 1,
    borderColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emojiChipActive: {
    borderColor: '#38bdf8',
    backgroundColor: 'rgba(56, 189, 248, 0.2)',
  },
  suggestedPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  suggestedPhotoBtnText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
  },
});
