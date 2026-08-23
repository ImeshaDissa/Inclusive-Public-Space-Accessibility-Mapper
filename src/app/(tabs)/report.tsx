import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Image,
  SafeAreaView,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function SubmitReportScreen() {
  const router = useRouter();
  const { places, addReport } = useApp();
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(places[0]?.id || '');
  const [customPlaceName, setCustomPlaceName] = useState<string>('');
  const [isCustomPlace, setIsCustomPlace] = useState<boolean>(false);

  const [features, setFeatures] = useState({
    ramp: true,
    elevator: false,
    toilet: true,
    parking: true,
    stepFree: true,
    tactilePaving: false,
    automaticDoor: false,
  });

  const [note, setNote] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1517649763962-0c623266010b?auto=format&fit=crop&w=800&q=80',
  ]);
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');
  const [showSuccessToast, setShowSuccessToast] = useState<boolean>(false);

  const toggleFeature = (key: keyof typeof features) => {
    setFeatures((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddSamplePhoto = () => {
    const samplePhotos = [
      'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=800&q=80',
    ];
    const nextPhoto = samplePhotos[photos.length % samplePhotos.length];
    setPhotos((prev) => [...prev, nextPhoto]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    const targetPlace = places.find((p) => p.id === selectedPlaceId);
    const placeName = isCustomPlace ? customPlaceName.trim() : targetPlace ? targetPlace.name : 'Unknown Place';

    if (isCustomPlace && !customPlaceName.trim()) {
      Alert.alert('Required Field', 'Please enter a venue name.');
      return;
    }

    addReport({
      placeId: isCustomPlace ? undefined : selectedPlaceId,
      placeName,
      note: note.trim() || 'Accessibility check performed.',
      featuresReported: features,
      photos,
      priority,
    });

    showToast(`Report submitted for ${placeName}`, 'success', 'checkmark-circle');
    setShowSuccessToast(true);

    setTimeout(() => {
      setNote('');
      setShowSuccessToast(false);
      router.push('/verify' as any);
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder, paddingTop: insets.top + 16 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Submit Accessibility Report</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Help map step-free paths & features in your community</Text>
        </View>
      </View>

      {showSuccessToast && (
        <View style={[styles.successToast, { backgroundColor: colors.successToastBg, borderColor: colors.successToastBorder }]}>
          <Ionicons name="checkmark-circle" size={24} color={colors.statusDotVerified} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.successToastTitle, { color: colors.successToastTitle }]}>Report Submitted!</Text>
            <Text style={[styles.successToastText, { color: colors.successToastText }]}>Added to Verification Queue for community audit.</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select or Enter Location */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.stepBadgeBg }]}>
              <Text style={[styles.stepBadgeText, { color: colors.stepBadgeText }]}>1</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SELECT VENUE OR LOCATION</Text>
          </View>

          {!isCustomPlace ? (
            <View style={styles.venuePickerContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Select from Existing Places:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueChipsScroll}>
                {places.map((place) => {
                  const isSelected = selectedPlaceId === place.id;
                  return (
                    <TouchableOpacity
                      key={place.id}
                      style={[styles.venueChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, isSelected && { backgroundColor: colors.segmentActiveBg, borderColor: colors.accent }]}
                      onPress={() => setSelectedPlaceId(place.id)}
                    >
                      <Ionicons name={isSelected ? 'location' : 'location-outline'} size={14} color={isSelected ? colors.filterActiveText : colors.accent} />
                      <Text style={[styles.venueChipText, { color: isSelected ? colors.filterActiveText : colors.textSecondary }, isSelected && { fontWeight: '700' }]}>
                        {place.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.customToggleBtn} onPress={() => setIsCustomPlace(true)}>
                <Ionicons name="add" size={16} color={colors.accentLight} />
                <Text style={[styles.customToggleText, { color: colors.accentLight }]}>+ Enter a New Venue Name</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.customInputContainer}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Enter Custom Venue Name:</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: colors.textPrimary }]}
                placeholder="e.g. Metro West Library, Grand Cinema..."
                placeholderTextColor={colors.textMuted}
                value={customPlaceName}
                onChangeText={setCustomPlaceName}
              />
              <TouchableOpacity style={styles.customToggleBtn} onPress={() => setIsCustomPlace(false)}>
                <Text style={[styles.customToggleText, { color: colors.accentLight }]}>← Pick from existing places list</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Step 2: Accessibility Checklist Toggles */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.stepBadgeBg }]}>
              <Text style={[styles.stepBadgeText, { color: colors.stepBadgeText }]}>2</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>VERIFY ACCESSIBILITY FEATURES</Text>
          </View>

          <View style={styles.toggleList}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="wheelchair" size={20} color={colors.statusDotVerified} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Wheelchair Ramp</Text>
              </View>
              <Switch value={features.ramp} onValueChange={() => toggleFeature('ramp')} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={features.ramp ? colors.accentLight : colors.toggleThumb} />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="elevator-passenger" size={20} color={colors.statusDotVerified} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Elevator Access</Text>
              </View>
              <Switch value={features.elevator} onValueChange={() => toggleFeature('elevator')} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={features.elevator ? colors.accentLight : colors.toggleThumb} />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="human-handsdown" size={20} color={colors.statusDotVerified} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Accessible Restroom</Text>
              </View>
              <Switch value={features.toilet} onValueChange={() => toggleFeature('toilet')} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={features.toilet ? colors.accentLight : colors.toggleThumb} />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="car" size={20} color={colors.statusDotVerified} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Reserved Disabled Parking</Text>
              </View>
              <Switch value={features.parking} onValueChange={() => toggleFeature('parking')} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={features.parking ? colors.accentLight : colors.toggleThumb} />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="walk" size={20} color={colors.statusDotVerified} />
                <Text style={[styles.toggleLabel, { color: colors.textPrimary }]}>Step-Free Entrance</Text>
              </View>
              <Switch value={features.stepFree} onValueChange={() => toggleFeature('stepFree')} trackColor={{ false: colors.toggleTrack, true: colors.accent }} thumbColor={features.stepFree ? colors.accentLight : colors.toggleThumb} />
            </View>
          </View>
        </View>

        {/* Step 3: Audit Note & Priority */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.stepBadgeBg }]}>
              <Text style={[styles.stepBadgeText, { color: colors.stepBadgeText }]}>3</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AUDIT NOTES & PRIORITY</Text>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>Audit Details / Notes:</Text>
          <TextInput
            style={[styles.textInput, styles.textArea, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: colors.textPrimary }]}
            placeholder="Describe condition, maintenance status, door width, slope steepness, etc..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />

          <Text style={[styles.label, { color: colors.textSecondary, marginTop: 12 }]}>Report Priority Level:</Text>
          <View style={styles.priorityRow}>
            {(['High', 'Medium', 'Low'] as const).map((p) => {
              const isSelected = priority === p;
              const colorMap = { High: colors.priorityHighBorder, Medium: colors.priorityMediumBorder, Low: colors.priorityLowBorder };
              const bgMap = { High: colors.priorityHighBg, Medium: colors.priorityMediumBg, Low: colors.priorityLowBg };
              const textMap = { High: colors.priorityHighText, Medium: colors.priorityMediumText, Low: colors.priorityLowText };
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, isSelected && { backgroundColor: bgMap[p], borderColor: colorMap[p] }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityChipText, { color: isSelected ? textMap[p] : colors.textSecondary }, isSelected && { fontWeight: '800' }]}>
                    {p} Priority
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: Photo Evidence */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.stepBadge, { backgroundColor: colors.stepBadgeBg }]}>
              <Text style={[styles.stepBadgeText, { color: colors.stepBadgeText }]}>4</Text>
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ATTACH PHOTO EVIDENCE</Text>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoList}>
            {photos.map((uri, idx) => (
              <View key={idx} style={styles.photoItem}>
                <Image source={{ uri }} style={styles.photoThumbnail} />
                <TouchableOpacity style={styles.removePhotoBtn} onPress={() => removePhoto(idx)}>
                  <Ionicons name="close" size={14} color="#FFF" />
                </TouchableOpacity>
              </View>
            ))}

            <TouchableOpacity style={[styles.addPhotoBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]} onPress={handleAddSamplePhoto}>
              <Ionicons name="camera-outline" size={24} color={colors.accent} />
              <Text style={[styles.addPhotoText, { color: colors.accentLight }]}>+ Attach Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.submitBtn }]} onPress={handleSubmit}>
          <Ionicons name="send" size={18} color={colors.submitBtnText} />
          <Text style={[styles.submitBtnText, { color: colors.submitBtnText }]}>Submit Community Audit Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
  },
  successToastTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  successToastText: {
    fontSize: 12,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  venuePickerContainer: {
    gap: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  venueChipsScroll: {
    flexDirection: 'row',
  },
  venueChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
  },
  venueChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  customToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  customInputContainer: {
    gap: 8,
  },
  textInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    borderWidth: 1,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  toggleList: {
    gap: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleLabelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityChip: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  photoList: {
    flexDirection: 'row',
    gap: 10,
  },
  photoItem: {
    position: 'relative',
    marginRight: 10,
  },
  photoThumbnail: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
  },
  addPhotoText: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '800',
  },
});
