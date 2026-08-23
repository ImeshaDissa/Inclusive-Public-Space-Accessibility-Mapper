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
  const { colors } = useAppTheme();
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0].label);
  const [note, setNote] = useState<string>('');

  const handleSubmit = () => {
    onSubmitDispute(selectedReason, note.trim());
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <View style={[styles.modalCard, { backgroundColor: colors.modalCard, borderColor: colors.modalBorder }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="alert-circle" size={22} color={colors.error} />
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Dispute Accessibility Report</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color={colors.closeBtn} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.subtext, { color: colors.textSecondary }]}>
            Disputing entry for <Text style={[styles.placeHighlight, { color: colors.textPrimary }]}>placeName</Text>. Choose a reason chip:
          </Text>

          {/* Reason Chips */}
          <View style={styles.chipsContainer}>
            {PRESET_REASONS.map((item) => {
              const isSelected = selectedReason === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }, isSelected && { backgroundColor: colors.chipSelectedBg, borderColor: colors.chipSelectedBorder }]}
                  onPress={() => setSelectedReason(item.label)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={isSelected ? colors.error : colors.textMuted}
                  />
                  <Text style={[styles.chipText, { color: isSelected ? colors.chipSelectedText : colors.textSecondary }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional Note Field */}
          <Text style={[styles.inputLabel, { color: colors.modalInputLabel }]}>Additional Context (Optional):</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.modalTextInputBg, borderColor: colors.modalTextInputBorder, color: colors.modalTextInput }]}
            placeholder="Explain why this report is inaccurate or outdated..."
            placeholderTextColor={colors.textMuted}
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.modalCancelBg }]} onPress={onClose}>
              <Text style={[styles.cancelText, { color: colors.modalCancelText }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.modalSubmitBg }]} onPress={handleSubmit}>
              <Ionicons name="warning-outline" size={16} color={colors.modalSubmitText} />
              <Text style={[styles.submitText, { color: colors.modalSubmitText }]}>Submit Dispute (+1)</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
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
  chipsContainer: {
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
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
    minHeight: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    marginBottom: 18,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
