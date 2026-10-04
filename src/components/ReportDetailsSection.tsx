import React, { useState, useMemo } from 'react';
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
  onSetAllFeatures?: (allOn: boolean) => void;
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
  onSetAllFeatures,
  note,
  onChangeNote,
  photos,
  onAddPhoto,
  onRemovePhoto,
  onBackToLocation,
}: ReportDetailsSectionProps) {
  const { colors } = useAppTheme();

  // Accessibility checklist dropdown state
  const [isFeaturesOpen, setIsFeaturesOpen] = useState<boolean>(false);
  const [filterCategory, setFilterCategory] = useState<'All' | 'Mobility' | 'Facilities' | 'Sensory'>('All');

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');

  const activeFeatureCount = Object.values(features).filter(Boolean).length;

  const confirmedFeatureKeys = useMemo(() => {
    return (Object.keys(FEATURE_METADATA) as FeatureKey[]).filter((k) => features[k]);
  }, [features]);

  const filteredKeys = useMemo(() => {
    const allKeys = Object.keys(FEATURE_METADATA) as FeatureKey[];
    if (filterCategory === 'All') return allKeys;
    return allKeys.filter((k) => FEATURE_METADATA[k].category === filterCategory);
  }, [filterCategory]);

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

      {/* ── Section 1: Accessibility Features Dropdown & Checklist ─ */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="shield-checkmark-outline" size={16} color={colors.accent} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              ACCESSIBILITY CRITERIA
            </Text>
          </View>
          <Text style={[styles.counterBadgeText, { color: colors.textMuted }]}>
            {activeFeatureCount} / 7 verified
          </Text>
        </View>

        {/* ── Dropdown Trigger Card ────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.dropdownTriggerCard,
            {
              backgroundColor: colors.card,
              borderColor: isFeaturesOpen ? colors.accent : colors.cardBorder,
            },
          ]}
          onPress={() => setIsFeaturesOpen(!isFeaturesOpen)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Accessibility features checklist dropdown, ${activeFeatureCount} confirmed. Tap to ${isFeaturesOpen ? 'collapse' : 'expand'}`}
        >
          <View style={styles.dropdownTriggerRow}>
            <View
              style={[
                styles.dropdownIconCircle,
                { backgroundColor: activeFeatureCount > 0 ? colors.accentBg : colors.chipBg },
              ]}
            >
              <Ionicons
                name={activeFeatureCount > 0 ? 'shield-checkmark' : 'shield-outline'}
                size={20}
                color={activeFeatureCount > 0 ? colors.accent : colors.textMuted}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.dropdownTriggerTitle, { color: colors.textPrimary }]}>
                Accessibility Checklist
              </Text>
              <Text style={[styles.dropdownTriggerSubtitle, { color: colors.textMuted }]}>
                {activeFeatureCount === 0
                  ? 'Tap to open checklist (0 / 7 selected)'
                  : `${activeFeatureCount} of 7 features verified`}
              </Text>
            </View>

            <View
              style={[
                styles.dropdownBadgePill,
                {
                  backgroundColor: activeFeatureCount > 0 ? colors.accentBg : colors.chipBg,
                  borderColor: activeFeatureCount > 0 ? colors.accent : colors.chipBorder,
                },
              ]}
            >
              <Text
                style={[
                  styles.dropdownBadgeText,
                  { color: activeFeatureCount > 0 ? colors.accent : colors.textMuted },
                ]}
              >
                {activeFeatureCount} Verified
              </Text>
            </View>

            <View
              style={[
                styles.chevronWrap,
                { backgroundColor: isFeaturesOpen ? colors.accentBg : colors.chipBg },
              ]}
            >
              <Ionicons
                name={isFeaturesOpen ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={isFeaturesOpen ? colors.accent : colors.textMuted}
              />
            </View>
          </View>

          {/* Compact confirmed chips preview when collapsed and features > 0 */}
          {!isFeaturesOpen && activeFeatureCount > 0 && (
            <View style={styles.confirmedChipsRow}>
              {confirmedFeatureKeys.map((key) => {
                const meta = FEATURE_METADATA[key];
                return (
                  <View
                    key={key}
                    style={[
                      styles.miniConfirmedChip,
                      { backgroundColor: colors.accentBg, borderColor: colors.accent },
                    ]}
                  >
                    <MaterialCommunityIcons name={meta.icon as any} size={13} color={colors.accent} />
                    <Text style={[styles.miniConfirmedChipText, { color: colors.accent }]}>
                      {meta.label}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </TouchableOpacity>

        {/* ── Dropdown Body (Expanded) ─────────────────────────── */}
        {isFeaturesOpen && (
          <View
            style={[
              styles.dropdownBody,
              { backgroundColor: colors.card, borderColor: colors.accent },
            ]}
          >
            {/* Category Segment Filter Tabs */}
            <View style={styles.categoryFilterRow}>
              {(['All', 'Mobility', 'Facilities', 'Sensory'] as const).map((cat) => {
                const isCatSelected = filterCategory === cat;
                const totalInCat =
                  cat === 'All'
                    ? 7
                    : (Object.keys(FEATURE_METADATA) as FeatureKey[]).filter(
                        (k) => FEATURE_METADATA[k].category === cat
                      ).length;
                const activeInCat =
                  cat === 'All'
                    ? activeFeatureCount
                    : (Object.keys(FEATURE_METADATA) as FeatureKey[]).filter(
                        (k) => FEATURE_METADATA[k].category === cat && features[k]
                      ).length;

                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setFilterCategory(cat)}
                    style={[
                      styles.categoryFilterTab,
                      {
                        backgroundColor: isCatSelected ? colors.accentBg : colors.chipBg,
                        borderColor: isCatSelected ? colors.accent : colors.chipBorder,
                      },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Filter by ${cat}`}
                  >
                    <Text
                      style={[
                        styles.categoryFilterText,
                        {
                          color: isCatSelected ? colors.accent : colors.textSecondary,
                          fontWeight: isCatSelected ? '700' : '600',
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                    <View
                      style={[
                        styles.filterTabCountPill,
                        {
                          backgroundColor:
                            activeInCat > 0
                              ? colors.accent
                              : isCatSelected
                              ? colors.card
                              : colors.chipBorder,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterTabCountText,
                          { color: activeInCat > 0 ? '#FFFFFF' : colors.textMuted },
                        ]}
                      >
                        {activeInCat > 0 ? `${activeInCat}/${totalInCat}` : totalInCat}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Quick Action Toolbar: count & Select All / Clear */}
            <View style={styles.checklistToolbar}>
              <Text style={[styles.toolbarHint, { color: colors.textMuted }]}>
                {filteredKeys.length} {filterCategory === 'All' ? 'criteria' : `${filterCategory.toLowerCase()} criteria`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={() => {
                    const areAllFilteredOn = filteredKeys.every((k) => features[k]);
                    if (filterCategory === 'All' && onSetAllFeatures) {
                      onSetAllFeatures(!areAllFilteredOn);
                    } else {
                      filteredKeys.forEach((k) => {
                        if (features[k] === areAllFilteredOn) {
                          onToggleFeature(k);
                        }
                      });
                    }
                  }}
                  style={[styles.toolActionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                  accessibilityRole="button"
                >
                  <Ionicons
                    name={filteredKeys.every((k) => features[k]) ? 'close-circle-outline' : 'checkmark-done'}
                    size={13}
                    color={colors.accent}
                  />
                  <Text style={[styles.toolActionText, { color: colors.accent }]}>
                    {filteredKeys.every((k) => features[k]) ? 'Deselect All' : 'Select All'}
                  </Text>
                </TouchableOpacity>

                {activeFeatureCount > 0 && onSetAllFeatures && (
                  <TouchableOpacity
                    onPress={() => onSetAllFeatures(false)}
                    style={[styles.toolActionBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
                    accessibilityRole="button"
                  >
                    <Ionicons name="trash-outline" size={13} color={colors.textMuted} />
                    <Text style={[styles.toolActionText, { color: colors.textMuted }]}>
                      Clear
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Features Checklist Item Cards */}
            <View style={styles.featuresDropdownList}>
              {filteredKeys.map((key) => {
                const meta = FEATURE_METADATA[key];
                const isOn = features[key];

                return (
                  <TouchableOpacity
                    key={key}
                    onPress={() => onToggleFeature(key)}
                    style={[
                      styles.dropdownFeatureItem,
                      {
                        backgroundColor: isOn ? colors.card : colors.chipBg,
                        borderColor: isOn ? colors.accent : colors.chipBorder,
                      },
                    ]}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: isOn }}
                    accessibilityLabel={`${meta.label}: ${isOn ? 'confirmed' : 'not confirmed'}`}
                  >
                    <View
                      style={[
                        styles.dropdownItemIconWrap,
                        { backgroundColor: isOn ? colors.accentBg : colors.card },
                      ]}
                    >
                      <MaterialCommunityIcons
                        name={meta.icon as any}
                        size={22}
                        color={isOn ? colors.accent : colors.textMuted}
                      />
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <Text
                          style={[
                            styles.dropdownItemTitle,
                            {
                              color: isOn ? colors.textPrimary : colors.textSecondary,
                              fontWeight: isOn ? '700' : '600',
                            },
                          ]}
                        >
                          {meta.label}
                        </Text>
                        <View style={[styles.categoryMicroTag, { backgroundColor: colors.chipBg }]}>
                          <Text style={[styles.categoryMicroTagText, { color: colors.textMuted }]}>
                            {meta.category}
                          </Text>
                        </View>
                      </View>
                      <Text style={[styles.dropdownItemDesc, { color: colors.textMuted }]}>
                        {meta.description}
                      </Text>
                    </View>

                    {/* Checkbox circle indicator */}
                    <View
                      style={[
                        styles.checkboxCircle,
                        {
                          backgroundColor: isOn ? colors.accent : 'transparent',
                          borderColor: isOn ? colors.accent : colors.chipBorder,
                        },
                      ]}
                    >
                      {isOn ? (
                        <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                      ) : (
                        <View style={styles.uncheckedDot} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Done / Collapse Action Button */}
            <TouchableOpacity
              style={[styles.closeDropdownBtn, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
              onPress={() => setIsFeaturesOpen(false)}
              accessibilityRole="button"
              accessibilityLabel="Done configuring features, collapse checklist"
            >
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.accent} />
              <Text style={[styles.closeDropdownText, { color: colors.accent }]}>
                Done ({activeFeatureCount} Confirmed) — Collapse Checklist
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Section 2: Real Photo Evidence Upload ──────────────── */}
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

      {/* ── Section 3: Audit Notes & Observations ──────────────── */}
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
    padding: 18,
    marginBottom: 24,
  },
  venueHeroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 6,
  },
  venueIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  venueCategoryTag: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  venueTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  changeVenueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  changeVenueText: {
    fontSize: 14,
    fontWeight: '800',
  },
  venueAddress: {
    fontSize: 14,
    marginTop: 4,
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
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
  },
  sectionHint: {
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  dropdownTriggerCard: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  dropdownTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  dropdownIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownTriggerTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  dropdownTriggerSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  dropdownBadgePill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownBadgeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  chevronWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmedChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(150, 150, 150, 0.15)',
  },
  miniConfirmedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  miniConfirmedChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownBody: {
    borderWidth: 1.5,
    borderRadius: 18,
    padding: 18,
    marginTop: 12,
    gap: 16,
  },
  categoryFilterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  categoryFilterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryFilterText: {
    fontSize: 13,
    fontWeight: '700',
  },
  filterTabCountPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  filterTabCountText: {
    fontSize: 10,
    fontWeight: '800',
  },
  checklistToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  toolbarHint: {
    fontSize: 13,
    fontWeight: '700',
  },
  toolActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
  },
  toolActionText: {
    fontSize: 13,
    fontWeight: '800',
  },
  featuresDropdownList: {
    gap: 12,
  },
  dropdownFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  dropdownItemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownItemTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  categoryMicroTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryMicroTagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  dropdownItemDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  checkboxCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeDropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  closeDropdownText: {
    fontSize: 15,
    fontWeight: '800',
  },
  uncheckedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#94A3B8',
  },
  uploadDropzone: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  uploadIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
  },
  uploadDropzoneTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  uploadDropzoneSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  urlToggleRow: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  urlToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  urlToggleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  urlInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  urlInput: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 14,
    borderWidth: 1,
  },
  urlAttachBtn: {
    paddingHorizontal: 18,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  urlAttachBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '800',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    marginTop: 18,
  },
  thumbnailWrap: {
    width: 105,
    height: 105,
    borderRadius: 16,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'visible',
    backgroundColor: '#F1F5F9',
  },
  thumbnailTouch: {
    width: 105,
    height: 105,
    borderRadius: 14,
    overflow: 'hidden',
  },
  thumbnailImage: {
    width: 105,
    height: 105,
  },
  removeBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#EF4444',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  photoIndexBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  photoIndexText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyPhotosBox: {
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 10,
  },
  emptyPhotosText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  charCount: {
    fontSize: 12,
    fontWeight: '700',
  },
  presetLabel: {
    fontSize: 13,
    marginBottom: 10,
  },
  presetScroll: {
    gap: 10,
    paddingBottom: 10,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
  },
  presetText: {
    fontSize: 14,
    fontWeight: '700',
  },
  noteInput: {
    minHeight: 140,
    borderRadius: 16,
    borderWidth: 1,
    padding: 18,
    fontSize: 16,
    textAlignVertical: 'top',
    marginTop: 12,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
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
    width: '100%',
    height: '80%',
  },
  counterBadgeText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
