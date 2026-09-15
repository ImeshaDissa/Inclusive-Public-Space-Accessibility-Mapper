import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DisputeSubmission } from '../types/verification';

interface DisputeReasonModalProps {
  visible: boolean;
  reportId: string | null;
  placeName?: string;
  onClose: () => void;
  onSubmit: (submission: DisputeSubmission) => void;
}

const PRESET_REASONS = [
  'Ramp missing',
  'Outdated info',
  'Access blocked',
  'Other',
];

export const DisputeReasonModal: React.FC<DisputeReasonModalProps> = ({
  visible,
  reportId,
  placeName,
  onClose,
  onSubmit,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>('Ramp missing');
  const [details, setDetails] = useState<string>('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleSelectReason = (reason: string) => {
    setSelectedReason(reason);
  };

  const handleToggleSamplePhoto = () => {
    if (photoUri) {
      setPhotoUri(null);
    } else {
      // Toggle a mock photo for attachment simulation
      setPhotoUri('https://images.unsplash.com/photo-1584467735815-f778f274e296?w=600&auto=format&fit=crop&q=80');
    }
  };

  const handleSubmit = () => {
    if (!reportId) return;

    onSubmit({
      reportId,
      reason: selectedReason,
      details: details.trim() ? details.trim() : undefined,
      photoUri,
    });

    // Reset state
    setSelectedReason('Ramp missing');
    setDetails('');
    setPhotoUri(null);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={styles.sheetContainer}
            >
              <View style={styles.dragHandleContainer}>
                <View style={styles.dragHandle} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Reason for Dispute</Text>
                  {placeName ? (
                    <Text style={styles.subtitle} numberOfLines={1}>
                      {placeName}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                  accessibilityLabel="Close dispute modal"
                >
                  <Ionicons name="close" size={20} color="#1B2A4A" />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
              >
                {/* Preset Reason Chips */}
                <Text style={styles.sectionLabel}>Select Reason</Text>
                <View style={styles.chipsRow}>
                  {PRESET_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason;
                    return (
                      <TouchableOpacity
                        key={reason}
                        style={[
                          styles.chip,
                          isSelected && styles.chipSelected,
                        ]}
                        onPress={() => handleSelectReason(reason)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            isSelected && styles.chipTextSelected,
                          ]}
                        >
                          {reason}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Additional Details Input */}
                <Text style={styles.sectionLabel}>
                  Additional Details <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Describe the discrepancy or accessibility issue..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  value={details}
                  onChangeText={setDetails}
                />

                {/* Attach Photo Area */}
                <Text style={styles.sectionLabel}>
                  Attach Photo <Text style={styles.optionalText}>(Optional)</Text>
                </Text>
                <TouchableOpacity
                  style={[
                    styles.uploadBox,
                    photoUri ? styles.uploadBoxWithImage : null,
                  ]}
                  onPress={handleToggleSamplePhoto}
                  activeOpacity={0.8}
                >
                  {photoUri ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                      <View style={styles.photoOverlayBadge}>
                        <Ionicons name="checkmark-circle" size={18} color="#4ADE80" />
                        <Text style={styles.photoAttachedText}>Photo Attached (Tap to remove)</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <View style={styles.iconCircle}>
                        <Ionicons name="image-outline" size={24} color="#1B2A4A" />
                        <View style={styles.plusBadge}>
                          <Ionicons name="add" size={10} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text style={styles.uploadTitle}>Tap to add proof photo</Text>
                      <Text style={styles.uploadSubtitle}>Supports JPG, PNG (Max 5MB)</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Full Width Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                >
                  <Text style={styles.submitButtonText}>Submit Dispute</Text>
                </TouchableOpacity>
              </ScrollView>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default DisputeReasonModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 20,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1B2A4A',
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B2A4A',
    marginBottom: 8,
    marginTop: 12,
  },
  optionalText: {
    fontWeight: '400',
    color: '#94A3B8',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipSelected: {
    backgroundColor: '#1B2A4A',
    borderColor: '#1B2A4A',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  textInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#1E293B',
    minHeight: 90,
  },
  uploadBox: {
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    overflow: 'hidden',
    minHeight: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  uploadBoxWithImage: {
    borderStyle: 'solid',
    borderColor: '#22C55E',
  },
  uploadPlaceholder: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  plusBadge: {
    position: 'absolute',
    right: -2,
    top: -2,
    backgroundColor: '#1B2A4A',
    borderRadius: 8,
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B2A4A',
  },
  uploadSubtitle: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  photoPreviewContainer: {
    width: '100%',
    height: 120,
    position: 'relative',
  },
  photoPreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  photoOverlayBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  photoAttachedText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#000000',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
