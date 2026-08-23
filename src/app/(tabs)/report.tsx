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

export default function SubmitReportScreen() {
  const router = useRouter();
  const { places, addReport } = useApp();

  const [selectedPlaceId, setSelectedPlaceId] = useState<string>(places[0]?.id || '');
  const [customPlaceName, setCustomPlaceName] = useState<string>('');
  const [isCustomPlace, setIsCustomPlace] = useState<boolean>(false);

  // Toggle Switches State
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

    setShowSuccessToast(true);

    // Reset form after short delay
    setTimeout(() => {
      setNote('');
      setShowSuccessToast(false);
      router.push('/verify' as any);
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Submit Accessibility Report</Text>
          <Text style={styles.headerSubtitle}>Help map step-free paths & features in your community</Text>
        </View>
      </View>

      {/* Success Notification Banner */}
      {showSuccessToast && (
        <View style={styles.successToast}>
          <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          <View style={{ flex: 1 }}>
            <Text style={styles.successToastTitle}>Report Submitted!</Text>
            <Text style={styles.successToastText}>Added to Verification Queue for community audit.</Text>
          </View>
        </View>
      )}

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select or Enter Location */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>SELECT VENUE OR LOCATION</Text>
          </View>

          {/* Place selector dropdown chips */}
          {!isCustomPlace ? (
            <View style={styles.venuePickerContainer}>
              <Text style={styles.label}>Select from Existing Places:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.venueChipsScroll}>
                {places.map((place) => {
                  const isSelected = selectedPlaceId === place.id;
                  return (
                    <TouchableOpacity
                      key={place.id}
                      style={[styles.venueChip, isSelected && styles.venueChipSelected]}
                      onPress={() => setSelectedPlaceId(place.id)}
                    >
                      <Ionicons
                        name={isSelected ? 'location' : 'location-outline'}
                        size={14}
                        color={isSelected ? '#FFF' : '#6366F1'}
                      />
                      <Text style={[styles.venueChipText, isSelected && styles.venueTextSelected]}>
                        {place.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity style={styles.customToggleBtn} onPress={() => setIsCustomPlace(true)}>
                <Ionicons name="add" size={16} color="#6366F1" />
                <Text style={styles.customToggleText}>+ Enter a New Venue Name</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.customInputContainer}>
              <Text style={styles.label}>Enter Custom Venue Name:</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. Metro West Library, Grand Cinema..."
                placeholderTextColor="#64748B"
                value={customPlaceName}
                onChangeText={setCustomPlaceName}
              />
              <TouchableOpacity style={styles.customToggleBtn} onPress={() => setIsCustomPlace(false)}>
                <Text style={styles.customToggleText}>← Pick from existing places list</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Step 2: Accessibility Checklist Toggles */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>VERIFY ACCESSIBILITY FEATURES</Text>
          </View>

          <View style={styles.toggleList}>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="wheelchair" size={20} color="#10B981" />
                <Text style={styles.toggleLabel}>Wheelchair Ramp</Text>
              </View>
              <Switch
                value={features.ramp}
                onValueChange={() => toggleFeature('ramp')}
                trackColor={{ false: '#334155', true: '#4F46E5' }}
                thumbColor={features.ramp ? '#818CF8' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="elevator-passenger" size={20} color="#10B981" />
                <Text style={styles.toggleLabel}>Elevator Access</Text>
              </View>
              <Switch
                value={features.elevator}
                onValueChange={() => toggleFeature('elevator')}
                trackColor={{ false: '#334155', true: '#4F46E5' }}
                thumbColor={features.elevator ? '#818CF8' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="human-handsdown" size={20} color="#10B981" />
                <Text style={styles.toggleLabel}>Accessible Restroom</Text>
              </View>
              <Switch
                value={features.toilet}
                onValueChange={() => toggleFeature('toilet')}
                trackColor={{ false: '#334155', true: '#4F46E5' }}
                thumbColor={features.toilet ? '#818CF8' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="car" size={20} color="#10B981" />
                <Text style={styles.toggleLabel}>Reserved Disabled Parking</Text>
              </View>
              <Switch
                value={features.parking}
                onValueChange={() => toggleFeature('parking')}
                trackColor={{ false: '#334155', true: '#4F46E5' }}
                thumbColor={features.parking ? '#818CF8' : '#94A3B8'}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelGroup}>
                <MaterialCommunityIcons name="walk" size={20} color="#10B981" />
                <Text style={styles.toggleLabel}>Step-Free Entrance</Text>
              </View>
              <Switch
                value={features.stepFree}
                onValueChange={() => toggleFeature('stepFree')}
                trackColor={{ false: '#334155', true: '#4F46E5' }}
                thumbColor={features.stepFree ? '#818CF8' : '#94A3B8'}
              />
            </View>
          </View>
        </View>

        {/* Step 3: Audit Note & Priority */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>AUDIT NOTES & PRIORITY</Text>
          </View>

          <Text style={styles.label}>Audit Details / Notes:</Text>
          <TextInput
            style={[styles.textInput, styles.textArea]}
            placeholder="Describe condition, maintenance status, door width, slope steepness, etc..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={4}
            value={note}
            onChangeText={setNote}
          />

          {/* Priority selector */}
          <Text style={[styles.label, { marginTop: 12 }]}>Report Priority Level:</Text>
          <View style={styles.priorityRow}>
            {(['High', 'Medium', 'Low'] as const).map((p) => {
              const isSelected = priority === p;
              const colorMap = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };
              return (
                <TouchableOpacity
                  key={p}
                  style={[
                    styles.priorityChip,
                    isSelected && { backgroundColor: colorMap[p] + '33', borderColor: colorMap[p] },
                  ]}
                  onPress={() => setPriority(p)}
                >
                  <Text
                    style={[
                      styles.priorityChipText,
                      isSelected && { color: colorMap[p], fontWeight: '800' },
                    ]}
                  >
                    {p} Priority
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: Photo Evidence */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>ATTACH PHOTO EVIDENCE</Text>
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

            <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddSamplePhoto}>
              <Ionicons name="camera-outline" size={24} color="#6366F1" />
              <Text style={styles.addPhotoText}>+ Attach Photo</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Submit Action Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
          <Ionicons name="send" size={18} color="#FFF" />
          <Text style={styles.submitBtnText}>Submit Community Audit Report</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  headerTitle: {
    color: '#F8FAFC',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94A3B8',
    fontSize: 12,
    marginTop: 2,
  },
  successToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#064E3B',
    borderColor: '#10B981',
    borderWidth: 1,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
  },
  successToastTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '800',
  },
  successToastText: {
    color: '#A7F3D0',
    fontSize: 12,
  },
  scrollContainer: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1E293B',
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
    backgroundColor: '#312E81',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBadgeText: {
    color: '#818CF8',
    fontSize: 11,
    fontWeight: '800',
  },
  sectionTitle: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  venuePickerContainer: {
    gap: 8,
  },
  label: {
    color: '#CBD5E1',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  venueChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#6366F1',
  },
  venueChipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  venueTextSelected: {
    color: '#FFF',
    fontWeight: '700',
  },
  customToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  customToggleText: {
    color: '#818CF8',
    fontSize: 12,
    fontWeight: '700',
  },
  customInputContainer: {
    gap: 8,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F8FAFC',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  priorityChipText: {
    color: '#94A3B8',
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
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    borderStyle: 'dashed',
  },
  addPhotoText: {
    color: '#818CF8',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 8,
    marginBottom: 30,
  },
  submitBtnText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
