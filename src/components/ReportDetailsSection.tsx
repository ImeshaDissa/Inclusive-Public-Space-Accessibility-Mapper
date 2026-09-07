import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { FeatureKey, FEATURE_METADATA, QUICK_AUDIT_PRESETS } from '@/constants/reportFeatures';
import { SelectedVenuePayload } from '@/types/categoryPlaces';
import { pickImageFromDevice } from '@/utils/imageUpload';

interface ReportDetailsSectionProps {
  selectedVenue: SelectedVenuePayload | null;
  coords: { latitude: number; longitude: number };
  features: Record<FeatureKey, boolean>;
  onToggleFeature: (key: FeatureKey) => void;
  priority: 'High' | 'Medium' | 'Low';
  onChangePriority: (p: 'High' | 'Medium' | 'Low') => void;
  note: string;
  onChangeNote: (text: string) => void;
  photos: string[];
  onAddPhoto: (uri: string) => void;
  onRemovePhoto: (index: number) => void;
  onBackToLocation: () => void;
}

export function ReportDetailsSection({
  selectedVenue,
  coords,
  features,
  onToggleFeature,
  priority,
  onChangePriority,
  note,
  onChangeNote,
  photos,
  onAddPhoto,
  onRemovePhoto,
  onBackToLocation,
}: ReportDetailsSectionProps) {
  const { colors } = useAppTheme();

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');

  const activeFeatureCount = Object.values(features).filter(Boolean).length;

  // Handle selecting real image from device
  const handleSelectImage = async () => {
    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos per report.');
      return;
    }

    setIsUploading(true);
    try {
      const uri = await pickImageFromDevice();
      if (uri) {
        onAddPhoto(uri);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not load the selected image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle adding image via URL
  const handleAddUrlImage = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      Alert.alert('Invalid URL', 'Please enter a valid web image URL starting with https://');
      return;
    }

    if (photos.length >= 5) {
      Alert.alert('Limit Reached', 'You can attach up to 5 photos per report.');
      return;
    }

    onAddPhoto(trimmed);
    setUrlInput('');
    setShowUrlInput(false);
  };

  // Quick tag append helper
  const handleAddQuickTag = (tag: string) => {
    if (!note.trim()) {
      onChangeNote(tag);
    } else if (!note.includes(tag)) {
      onChangeNote(`${note.trim()}\n• ${tag}`);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Venue Summary Header Card ─────────────────────────── */}
      <View style={[styles.venueHeroCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={styles.venueHeroTop}>
          <View style={[styles.venueIconWrap, { backgroundColor: colors.accentBg }]}>
            <Ionicons name="location" size={20} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.venueCategoryTag, { color: colors.accent }]}>
              {(selectedVenue?.category || 'Public Place').toUpperCase()}
            </Text>
            <Text style={[styles.venueTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedVenue?.name || 'Selected Location'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.changeVenueBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
            onPress={onBackToLocation}
            accessibilityRole="button"
            accessibilityLabel="Change location or venue"
          >
            <Ionicons name="create-outline" size={14} color={colors.textPrimary} />
            <Text style={[styles.changeVenueText, { color: colors.textPrimary }]}>Change</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.venueAddress, { color: colors.textMuted }]} numberOfLines={1}>
          {selectedVenue?.address || `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`}
        </Text>
      </View>

      {/* ── Section 1: Accessibility Features ──────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              ACCESSIBILITY FEATURES CHECKLIST
            </Text>
          </View>
          <View style={[styles.counterBadge, { backgroundColor: colors.accentBg }]}>
            <Text style={[styles.counterBadgeText, { color: colors.accent }]}>
              {activeFeatureCount} of {Object.keys(FEATURE_METADATA).length} Confirmed
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          Tap to toggle the features available at this location:
        </Text>

        <View style={styles.featuresList}>
          {(Object.keys(FEATURE_METADATA) as FeatureKey[]).map((key) => {
            const meta = FEATURE_METADATA[key];
            const isOn = features[key];

            return (
              <TouchableOpacity
                key={key}
                onPress={() => onToggleFeature(key)}
                style={[
                  styles.featureRow,
                  {
                    backgroundColor: isOn ? colors.card : colors.chipBg,
                    borderColor: isOn ? colors.accent : colors.chipBorder,
                  },
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isOn }}
                accessibilityLabel={`${meta.label}: ${isOn ? 'available' : 'not available'}`}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    {
                      backgroundColor: isOn ? colors.accentBg : colors.card,
                    },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={meta.icon as any}
                    size={22}
                    color={isOn ? colors.accent : colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.featureTitle,
                      { color: isOn ? colors.textPrimary : colors.textSecondary, fontWeight: isOn ? '700' : '600' },
                    ]}
                  >
                    {meta.label}
                  </Text>
                  <Text style={[styles.featureDescription, { color: colors.textMuted }]}>
                    {meta.description}
                  </Text>
                </View>

                {/* State Pill / Checkbox */}
                <View
                  style={[
                    styles.featureStatusPill,
                    {
                      backgroundColor: isOn ? colors.accent : 'transparent',
                      borderColor: isOn ? colors.accent : colors.chipBorder,
                    },
                  ]}
                >
                  {isOn ? (
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                  ) : (
                    <View style={styles.uncheckedDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Section 2: Priority / Urgency Level ────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              REPORT PRIORITY
            </Text>
          </View>
        </View>

        <View style={styles.priorityGrid}>
          {[
            {
              level: 'High' as const,
              title: 'High Priority',
              subtitle: 'Major barrier or immediate safety concern',
              color: '#EF4444',
              bg: '#FEF2F2',
            },
            {
              level: 'Medium' as const,
              title: 'Medium Priority',
              subtitle: 'Needs repair, maintenance or improvement',
              color: '#F59E0B',
              bg: '#FFFBEB',
            },
            {
              level: 'Low' as const,
              title: 'Low Priority',
              subtitle: 'Routine update or general audit confirmation',
              color: '#10B981',
              bg: '#ECFDF5',
            },
          ].map((item) => {
            const isSelected = priority === item.level;
            return (
              <TouchableOpacity
                key={item.level}
                onPress={() => onChangePriority(item.level)}
                style={[
                  styles.priorityCard,
                  {
                    backgroundColor: isSelected ? item.bg : colors.card,
                    borderColor: isSelected ? item.color : colors.cardBorder,
                  },
                ]}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
              >
                <View style={styles.priorityCardHeader}>
                  <View style={[styles.priorityIndicatorDot, { backgroundColor: item.color }]} />
                  <Text
                    style={[
                      styles.priorityCardTitle,
                      { color: isSelected ? item.color : colors.textPrimary, fontWeight: isSelected ? '800' : '700' },
                    ]}
                  >
                    {item.title}
                  </Text>
                  <View style={{ flex: 1 }} />
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={16} color={item.color} />
                  )}
                </View>
                <Text style={[styles.priorityCardSubtitle, { color: colors.textMuted }]}>
                  {item.subtitle}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Section 3: Real Photo Evidence Upload ──────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="camera-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              PHOTO EVIDENCE
            </Text>
          </View>
          <Text style={[styles.counterBadgeText, { color: colors.textMuted }]}>
            {photos.length} / 5 photos
          </Text>
        </View>

        <Text style={[styles.sectionHint, { color: colors.textMuted }]}>
          Upload photos from your device to provide visual proof for community auditors:
        </Text>

        {/* Real Device Upload Dropzone Button */}
        <TouchableOpacity
          style={[styles.uploadDropzone, { backgroundColor: colors.chipBg, borderColor: colors.accent }]}
          onPress={handleSelectImage}
          disabled={isUploading || photos.length >= 5}
          accessibilityRole="button"
          accessibilityLabel="Select and upload image from your device"
        >
          {isUploading ? (
            <ActivityIndicator size="small" color={colors.accent} />
          ) : (
            <View style={[styles.uploadIconCircle, { backgroundColor: colors.card }]}>
              <Ionicons name="cloud-upload-outline" size={24} color={colors.accent} />
            </View>
          )}

          <Text style={[styles.uploadDropzoneTitle, { color: colors.textPrimary }]}>
            {isUploading ? 'Loading Photo…' : 'Select Image from Device'}
          </Text>
          <Text style={[styles.uploadDropzoneSubtitle, { color: colors.textMuted }]}>
            Tap to open your gallery or device files (PNG, JPG)
          </Text>
        </TouchableOpacity>

        {/* Alternative: Add photo via URL */}
        <View style={styles.urlToggleRow}>
          <TouchableOpacity
            onPress={() => setShowUrlInput(!showUrlInput)}
            style={styles.urlToggleBtn}
          >
            <Ionicons name={showUrlInput ? 'chevron-up' : 'link-outline'} size={14} color={colors.accent} />
            <Text style={[styles.urlToggleText, { color: colors.accent }]}>
              {showUrlInput ? 'Hide URL upload' : 'Or attach via image URL'}
            </Text>
          </TouchableOpacity>
        </View>

        {showUrlInput && (
          <View style={[styles.urlInputContainer, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <TextInput
              style={[styles.urlInput, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder, color: colors.textPrimary }]}
              placeholder="Paste https:// image URL…"
              placeholderTextColor={colors.textMuted}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={[styles.urlAttachBtn, { backgroundColor: colors.accent }]}
              onPress={handleAddUrlImage}
            >
              <Text style={styles.urlAttachBtnText}>Add</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Thumbnails of uploaded photos */}
        {photos.length > 0 ? (
          <View style={styles.galleryGrid}>
            {photos.map((uri, idx) => (
              <View key={idx} style={[styles.thumbnailWrap, { borderColor: colors.cardBorder }]}>
                <TouchableOpacity
                  style={styles.thumbnailTouch}
                  onPress={() => setPreviewImage(uri)}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={`View photo ${idx + 1}`}
                >
                  <Image
                    source={{ uri }}
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    transition={200}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeBadge}
                  onPress={() => onRemovePhoto(idx)}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove photo ${idx + 1}`}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={13} color="#FFFFFF" />
                </TouchableOpacity>

                <View style={styles.photoIndexBadge}>
                  <Text style={styles.photoIndexText}>#{idx + 1}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.emptyPhotosBox, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="images-outline" size={24} color={colors.textMuted} />
            <Text style={[styles.emptyPhotosText, { color: colors.textMuted }]}>
              No photos attached yet. Attach photos of ramps, elevators, or doors to speed up verification.
            </Text>
          </View>
        )}
      </View>

      {/* ── Section 4: Audit Notes & Observations ──────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="create-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              DETAILED OBSERVATIONS
            </Text>
          </View>
          <Text style={[styles.charCount, { color: colors.textMuted }]}>
            {note.length} / 500
          </Text>
        </View>

        {/* Quick Audit Presets */}
        <Text style={[styles.presetLabel, { color: colors.textMuted }]}>Quick preset notes (tap to insert):</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.presetScroll}>
          {QUICK_AUDIT_PRESETS.map((preset, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => handleAddQuickTag(preset)}
              style={[styles.presetChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
            >
              <Ionicons name="add" size={12} color={colors.accent} />
              <Text style={[styles.presetText, { color: colors.textSecondary }]}>{preset}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TextInput
          style={[
            styles.noteInput,
            {
              backgroundColor: colors.card,
              borderColor: colors.cardBorder,
              color: colors.textPrimary,
            },
          ]}
          placeholder="Describe door widths, ramp slopes, operational status, sensory guidance, or any maintenance issues…"
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={4}
          value={note}
          onChangeText={onChangeNote}
          maxLength={500}
        />
      </View>

      {/* ── Community Audit Info Card ──────────────────────────── */}
      <View style={[styles.impactCard, { backgroundColor: colors.accentBg, borderColor: colors.accentLight }]}>
        <Ionicons name="people-circle-outline" size={24} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.impactTitle, { color: colors.accent }]}>Community Verification</Text>
          <Text style={[styles.impactText, { color: colors.textSecondary }]}>
            Your audit report will be submitted to local accessibility auditors to help wheelchair and mobility users navigate public spaces safely.
          </Text>
        </View>
      </View>

      {/* Fullscreen Photo Preview Modal */}
      <Modal visible={!!previewImage} transparent animationType="fade" onRequestClose={() => setPreviewImage(null)}>
        <View style={styles.modalBackdrop}>
          <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setPreviewImage(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {previewImage && (
            <Image
              source={{ uri: previewImage }}
              style={styles.fullPreviewImage}
              contentFit="contain"
              transition={200}
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 30,
  },
  venueHeroCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
  },
  venueHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  venueIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueCategoryTag: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  venueTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  changeVenueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  changeVenueText: {
    fontSize: 12,
    fontWeight: '700',
  },
  venueAddress: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionLabel: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionHint: {
    fontSize: 12,
    marginBottom: 12,
    lineHeight: 16,
  },
  counterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  counterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  featuresList: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureTitle: {
    fontSize: 13.5,
  },
  featureDescription: {
    fontSize: 11.5,
    marginTop: 1,
  },
  featureStatusPill: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uncheckedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#94A3B8',
  },
  priorityGrid: {
    gap: 10,
  },
  priorityCard: {
    borderWidth: 1.5,
    borderRadius: 16,
    padding: 12,
    gap: 4,
  },
  priorityCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priorityIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  priorityCardTitle: {
    fontSize: 13.5,
  },
  priorityCardSubtitle: {
    fontSize: 11.5,
    marginLeft: 16,
  },
  uploadDropzone: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 18,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  uploadDropzoneTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  uploadDropzoneSubtitle: {
    fontSize: 11.5,
    textAlign: 'center',
  },
  urlToggleRow: {
    marginTop: 8,
    alignItems: 'flex-start',
  },
  urlToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  urlToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
  },
  urlInput: {
    flex: 1,
    height: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    borderWidth: 1,
  },
  urlAttachBtn: {
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlAttachBtnText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '700',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 14,
  },
  thumbnailWrap: {
    width: 95,
    height: 95,
    borderRadius: 14,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
  },
  thumbnailTouch: {
    width: 95,
    height: 95,
  },
  thumbnailImage: {
    width: 95,
    height: 95,
    borderRadius: 12,
  },
  removeBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  photoIndexText: {
    color: '#FFF',
    fontSize: 9.5,
    fontWeight: '700',
  },
  emptyPhotosBox: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  emptyPhotosText: {
    fontSize: 11.5,
    textAlign: 'center',
    lineHeight: 16,
  },
  charCount: {
    fontSize: 11,
    fontWeight: '600',
  },
  presetLabel: {
    fontSize: 11,
    marginBottom: 6,
  },
  presetScroll: {
    gap: 8,
    paddingBottom: 8,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 11.5,
  },
  noteInput: {
    minHeight: 100,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    fontSize: 13.5,
    textAlignVertical: 'top',
    marginTop: 6,
  },
  impactCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  impactTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  impactText: {
    fontSize: 11.5,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  fullPreviewImage: {
    width: '90%',
    height: '75%',
  },
});
