import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  SafeAreaView,
  Alert
} from 'react-native';
import { db, storage } from '../../lib/firebase';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import {
  Building2,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Phone,
  Instagram,
  Save,
  Image as ImageIcon,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Sparkles
} from 'lucide-react-native';

const POPULAR_AMENITIES = [
  'FIFA Certified Turf',
  'LED Floodlights',
  'Free Parking',
  'Café & Refreshments',
  'Changing Rooms & Showers',
  'Free High-Speed Wi-Fi',
  'Air-Conditioned Lounge',
  'Footballs & Bibs Included'
];

export const OwnerBrandProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [uploadingLogo, setUploadingLogo] = useState<boolean>(false);

  // Form State
  const [handle, setHandle] = useState<string>('');
  const [brandName, setBrandName] = useState<string>('');
  const [tagline, setTagline] = useState<string>('');
  const [logoUrl, setLogoUrl] = useState<string>('');
  const [coverUrl, setCoverUrl] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [city, setCity] = useState<string>('Mumbai');
  const [address, setAddress] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [whatsapp, setWhatsapp] = useState<string>('');
  const [instagramHandle, setInstagramHandle] = useState<string>('');
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<string>('pending');
  const [followersCount, setFollowersCount] = useState<number>(0);

  useEffect(() => {
    const fetchBrandProfile = async () => {
      if (!user) return;
      try {
        const docRef = doc(db, 'ownerBrandProfiles', user.uid);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          setHandle(data.handle || '');
          setBrandName(data.brandName || '');
          setTagline(data.tagline || '');
          setLogoUrl(data.logoUrl || '');
          setCoverUrl(data.coverUrl || '');
          setBio(data.bio || '');
          setCity(data.city || 'Mumbai');
          setAddress(data.address || '');
          setPhone(data.phone || '');
          setWhatsapp(data.whatsapp || '');
          setInstagramHandle(data.instagramHandle || '');
          setSelectedAmenities(data.amenities || []);
          setVerificationStatus(data.verificationStatus || 'pending');
          setFollowersCount(data.followersCount || 0);
        } else {
          setBrandName(profile?.businessName || 'Sports Arena');
          setHandle('@' + (profile?.businessName || 'arena').toLowerCase().replace(/[^a-z0-9]/g, ''));
          setCity(profile?.city || 'Mumbai');
        }
      } catch (err) {
        console.error('Error loading brand profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBrandProfile();
  }, [user, profile]);

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      try {
        setUploadingLogo(true);
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `owner_logos/${user?.uid}/${Date.now()}.jpg`);
        await uploadBytes(storageRef, blob);
        const url = await getDownloadURL(storageRef);
        setLogoUrl(url);
      } catch (err) {
        console.error('Error uploading logo:', err);
        Alert.alert('Upload Error', 'Failed to upload brand logo.');
      } finally {
        setUploadingLogo(false);
      }
    }
  };

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities((prev) =>
      prev.includes(amenity) ? prev.filter((a) => a !== amenity) : [...prev, amenity]
    );
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'ownerBrandProfiles', user.uid);
      const payload = {
        id: user.uid,
        ownerId: user.uid,
        handle: handle.trim(),
        brandName: brandName.trim(),
        tagline: tagline.trim(),
        logoUrl,
        coverUrl,
        bio: bio.trim(),
        city: city.trim(),
        address: address.trim(),
        phone: phone.trim(),
        whatsapp: whatsapp.trim(),
        instagramHandle: instagramHandle.trim(),
        amenities: selectedAmenities,
        updatedAt: new Date().toISOString(),
      };

      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, payload);
      } else {
        await setDoc(docRef, {
          ...payload,
          followersCount: 0,
          followers: [],
          createdAt: new Date().toISOString(),
        });
      }

      Alert.alert('Success', 'Owner Brand Profile updated successfully!');
      navigation.goBack();
    } catch (err) {
      console.error('Error saving brand profile:', err);
      Alert.alert('Error', 'Failed to save profile changes.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <ArrowLeft size={20} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Owner Brand Profile & Social</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          <Save size={18} color="#ffffff" />
          <Text style={styles.saveBtnText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Verification Status Card */}
        <View style={styles.verificationCard}>
          {verificationStatus === 'verified' ? (
            <>
              <ShieldCheck size={24} color="#10b981" />
              <View style={styles.verificationTextContainer}>
                <Text style={styles.verifiedTitle}>Verified TruFit Venue</Text>
                <Text style={styles.verifiedSubtitle}>Your brand displays the official verified blue badge.</Text>
              </View>
            </>
          ) : (
            <>
              <Clock size={24} color="#f59e0b" />
              <View style={styles.verificationTextContainer}>
                <Text style={styles.pendingTitle}>Verification Pending</Text>
                <Text style={styles.pendingSubtitle}>Submit legal documents to unlock the verified badge.</Text>
              </View>
            </>
          )}
        </View>

        {/* Logo & Brand Identity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Brand Identity & Logo</Text>
          <View style={styles.logoRow}>
            <TouchableOpacity style={styles.logoContainer} onPress={pickLogo} disabled={uploadingLogo}>
              {logoUrl ? (
                <Image source={{ uri: logoUrl }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Building2 size={24} color="#10b981" />
                </View>
              )}
              {uploadingLogo && (
                <View style={styles.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#ffffff" />
                </View>
              )}
            </TouchableOpacity>
            <View style={styles.flex}>
              <Text style={styles.label}>Brand / Venue Name</Text>
              <TextInput
                style={styles.input}
                value={brandName}
                onChangeText={setBrandName}
                placeholder="e.g. Metro Turf & Arena"
                placeholderTextColor="#64748b"
              />
            </View>
          </View>

          <Text style={styles.label}>Social Handle</Text>
          <TextInput
            style={styles.input}
            value={handle}
            onChangeText={setHandle}
            placeholder="@metroturf"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Tagline</Text>
          <TextInput
            style={styles.input}
            value={tagline}
            onChangeText={setTagline}
            placeholder="Mumbai's Premier 7-Aside Football Turf"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Bio / About</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Tell players about your turf facilities, tournaments, and coaching..."
            placeholderTextColor="#64748b"
            multiline
          />
        </View>

        {/* Contact & Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contact & Location</Text>
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Mumbai"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Full Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Link Road, Andheri West"
            placeholderTextColor="#64748b"
          />

          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="+91 98765 43210"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>WhatsApp Number</Text>
          <TextInput
            style={styles.input}
            value={whatsapp}
            onChangeText={setWhatsapp}
            placeholder="+91 98765 43210"
            placeholderTextColor="#64748b"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Instagram Handle</Text>
          <TextInput
            style={styles.input}
            value={instagramHandle}
            onChangeText={setInstagramHandle}
            placeholder="metroturf_official"
            placeholderTextColor="#64748b"
          />
        </View>

        {/* Amenities */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Venue Amenities</Text>
          <View style={styles.amenitiesGrid}>
            {POPULAR_AMENITIES.map((amenity) => {
              const selected = selectedAmenities.includes(amenity);
              return (
                <TouchableOpacity
                  key={amenity}
                  style={[styles.amenityChip, selected && styles.selectedAmenityChip]}
                  onPress={() => toggleAmenity(amenity)}
                >
                  <Text style={[styles.amenityText, selected && styles.selectedAmenityText]}>{amenity}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#090d16' },
  flex: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#090d16' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#1e293b', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: 'bold', color: '#ffffff' },
  saveBtn: { backgroundColor: '#10b981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 13 },
  scrollContent: { padding: 16 },
  verificationCard: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: '#1e293b', flexDirection: 'row', alignItems: 'center', gap: 14 },
  verificationTextContainer: { flex: 1 },
  verifiedTitle: { color: '#10b981', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  verifiedSubtitle: { color: '#94a3b8', fontSize: 11 },
  pendingTitle: { color: '#f59e0b', fontWeight: 'bold', fontSize: 14, marginBottom: 2 },
  pendingSubtitle: { color: '#94a3b8', fontSize: 11 },
  section: { backgroundColor: '#0f172a', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#1e293b' },
  sectionTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 16 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 16 },
  logoContainer: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: '#10b981', position: 'relative' },
  logoImage: { width: '100%', height: '100%' },
  logoPlaceholder: { width: '100%', height: '100%', justifyContent: 'center', alignItems: 'center' },
  uploadingOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  input: { backgroundColor: '#1e293b', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: '#ffffff', fontSize: 14, borderWidth: 1, borderColor: '#334155' },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  amenitiesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  amenityChip: { backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#334155' },
  selectedAmenityChip: { backgroundColor: '#10b98120', borderColor: '#10b981' },
  amenityText: { color: '#94a3b8', fontSize: 12, fontWeight: '500' },
  selectedAmenityText: { color: '#10b981', fontWeight: 'bold' }
});
