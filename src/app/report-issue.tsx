import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { createReportInBackend } from '@/features/reports/api';
import { ReportDetailsSection } from '@/components/ReportDetailsSection';

export default function ReportIssueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { colors } = useAppTheme();
  const { addReport } = useApp();

  // Extract params passed from the map
  const placeId = (params.placeId as string) || '';
  const placeName = (params.placeName as string) || 'Selected Place';
  const category = (params.category as string) || 'Other';
  const address = (params.address as string) || '';
  const lat = parseFloat(params.lat as string) || 0;
  const lng = parseFloat(params.lng as string) || 0;

  // Form State
  const [features, setFeatures] = useState<Record<string, boolean>>({
    ramp: false,
    elevator: false,
    toilet: false,
    parking: false,
    stepFree: false,
    tactilePaving: false,
    automaticDoor: false,
  });
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPhoto = (uri: string) => {
    setPhotos((prev) => [...prev, uri]);
  };

  const handleRemovePhoto = (idx: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!note.trim() && photos.length === 0) {
      Alert.alert(
        'Incomplete Report',
        'Please provide an observation note or attach a photo describing the issue (e.g. "Ramp is damaged").'
      );
      return;
    }

    if (photos.length > 5) {
      Alert.alert('Too Many Photos', 'You can only attach up to 5 photos per report.');
      return;
    }

    setIsSubmitting(true);

    // Simulate network wait for UX
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const result = await createReportInBackend({
      placeId: placeId,
      placeName: placeName,
      category: category,
      note: note,
      featuresReported: features,
      photos: photos,
      priority: 'High', // Flag updates/issues as high priority
      location: {
        latitude: lat,
        longitude: lng,
        address: address,
      },
    });

    setIsSubmitting(false);

    if (result.success) {
      addReport(result.report);
      Alert.alert(
        'Report Submitted',
        'Thank you for updating the accessibility status! Your report helps the community stay informed.',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      Alert.alert('Submission Error', result.error || 'Failed to submit report. Please try again.');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg, borderBottomColor: colors.headerBorder }]}>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} disabled={isSubmitting}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Report Issue</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.scrollArea} keyboardShouldPersistTaps="handled">
        {/* Helper Context Text */}
        <View style={[styles.infoBanner, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}>
          <Ionicons name="information-circle" size={24} color={colors.accent} />
          <Text style={[styles.infoText, { color: colors.textPrimary }]}>
            Use this form to report missing, damaged, or changed accessibility features for {placeName}.
          </Text>
        </View>

        {/* Reuse the accessible details section! */}
        <ReportDetailsSection
          selectedVenue={{ name: placeName, category, categoryId: "other", isNewCustomPlace: false, address, placeId }}
          coords={{ latitude: lat, longitude: lng }}
          features={features}
          onToggleFeature={(key) => setFeatures((prev) => ({ ...prev, [key]: !prev[key] }))}
          note={note}
          onChangeNote={setNote}
          photos={photos}
          onAddPhoto={handleAddPhoto}
          onRemovePhoto={handleRemovePhoto}
        />
      </ScrollView>

      {/* Floating Submit Button */}
      <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.cardBorder }]}>
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: colors.accent },
            isSubmitting && { opacity: 0.7 },
          ]}
          disabled={isSubmitting}
          onPress={handleSubmit}
          accessibilityRole="button"
          accessibilityLabel={isSubmitting ? 'Submitting issue report' : 'Submit Issue Report'}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="alert-circle" size={24} color="#FFFFFF" />
          )}
          <Text style={styles.submitBtnText}>
            {isSubmitting ? 'Submitting...' : 'Submit Issue'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  closeBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  scrollArea: {
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    margin: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 16,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
});
