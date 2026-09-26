import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

interface DisputeModalProps {
  visible: boolean;
  placeName: string;
  onClose: () => void;
  onSubmitDispute: (reason: string, note?: string) => void;
}

const PRESET_REASONS = [
  { id: 'ramp_missing', label: 'Ramp missing / steep slope' },
  { id: 'outdated_info', label: 'Outdated accessibility info' },
  { id: 'access_blocked', label: 'Entrance or elevator blocked' },
  { id: 'other', label: 'Other accuracy issue' },
];

export const DisputeModal: React.FC<DisputeModalProps> = ({
  visible,
  placeName,
  onClose,
  onSubmitDispute,
}) => {
  const { colors, isDark } = useAppTheme();
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0].label);
  const [note, setNote] = useState<string>('');

  const handleSubmit = () => {
    onSubmitDispute(selectedReason, note.trim());
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay || 'rgba(0, 0, 0, 0.65)' }]}>
        <TouchableOpacity style={styles.backdropDismiss} activeOpacity={1} onPress={onClose} />
        
        {/* Bottom Sheet Container */}
        <View style={[styles.sheetCard, { backgroundColor: colors.modalCard || colors.card, borderColor: colors.modalBorder || colors.cardBorder }]}>
          {/* Top Sheet Drag Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.cardBorder || colors.divider }]} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Reason for Dispute
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={colors.closeBtn || colors.textPrimary} />
            </TouchableOpacity>
          </View>

          {/* Subtext */}
          {placeName ? (
            <Text style={[styles.subtext, { color: colors.textSecondary }]}>
              Disputing entry for <Text style={[styles.placeHighlight, { color: colors.textPrimary }]}>{placeName}</Text>. Select a reason below:
            </Text>
          ) : null}

          {/* Wrapped Reason Chips */}
          <View style={styles.chipsRow}>
            {PRESET_REASONS.map((item) => {
              const isSelected = selectedReason === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isSelected ? (isDark ? colors.accent : '#1B2A4A') : colors.chipBg,
                      borderColor: isSelected ? (isDark ? colors.accent : '#1B2A4A') : colors.chipBorder,
                    },
                  ]}
                  onPress={() => setSelectedReason(item.label)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.chipText,
                      { color: isSelected ? '#FFFFFF' : colors.textPrimary },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Additional Details (Optional) */}
          <Text style={[styles.inputLabel, { color: colors.modalInputLabel || colors.textPrimary }]}>
            Additional Details (Optional)
          </Text>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.modalTextInputBg || colors.inputBg,
                borderColor: colors.modalTextInputBorder || colors.inputBorder,
                color: colors.modalTextInput || colors.textPrimary,
              },
            ]}
            placeholder="Explain why this report is inaccurate or outdated..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />

          {/* Attach Photo (Optional) Upload Area */}
          <TouchableOpacity style={[styles.uploadArea, { borderColor: colors.cardBorder, backgroundColor: colors.chipBg }]} activeOpacity={0.7}>
            <Ionicons name="image-outline" size={20} color={colors.accent} />
            <Text style={[styles.uploadText, { color: colors.textPrimary }]}>Attach Photo (Optional)</Text>
          </TouchableOpacity>

          {/* Full-width Submit Dispute Button */}
          <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.modalSubmitBg || colors.accent }]} onPress={handleSubmit} activeOpacity={0.85}>
            <Text style={[styles.submitBtnText, { color: colors.modalSubmitText || '#FFFFFF' }]}>Submit Dispute</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const DisputeReasonModal = DisputeModal;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropDismiss: {
    flex: 1,
  },
  sheetCard: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  sheetHandle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  subtext: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  placeHighlight: {
    fontWeight: '700',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    minHeight: 76,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 14,
  },
  uploadArea: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  uploadText: {
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
