import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  const [selectedReason, setSelectedReason] = useState<string>(PRESET_REASONS[0].label);
  const [note, setNote] = useState<string>('');

  const handleSubmit = () => {
    onSubmitDispute(selectedReason, note.trim());
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="alert-circle" size={22} color="#EF4444" />
              <Text style={styles.headerTitle}>Dispute Accessibility Report</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={18} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            Disputing entry for <Text style={styles.placeHighlight}>{placeName}</Text>. Choose a reason chip:
          </Text>

          {/* Reason Chips */}
          <View style={styles.chipsContainer}>
            {PRESET_REASONS.map((item) => {
              const isSelected = selectedReason === item.label;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.chip, isSelected && styles.selectedChip]}
                  onPress={() => setSelectedReason(item.label)}
                >
                  <Ionicons
                    name={isSelected ? 'radio-button-on' : 'radio-button-off'}
                    size={14}
                    color={isSelected ? '#EF4444' : '#64748B'}
                  />
                  <Text style={[styles.chipText, isSelected && styles.selectedChipText]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Optional Note Field */}
          <Text style={styles.inputLabel}>Additional Context (Optional):</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Explain why this report is inaccurate or outdated..."
            placeholderTextColor="#64748B"
            multiline
            numberOfLines={3}
            value={note}
            onChangeText={setNote}
          />

          {/* Action Buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Ionicons name="warning-outline" size={16} color="#FFF" />
              <Text style={styles.submitText}>Submit Dispute (+1)</Text>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#0F172A',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
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
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  subtext: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  placeHighlight: {
    color: '#F8FAFC',
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
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  selectedChip: {
    backgroundColor: '#451A03',
    borderColor: '#EF4444',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedChipText: {
    color: '#FCA5A5',
    fontWeight: '700',
  },
  inputLabel: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 12,
    color: '#F8FAFC',
    fontSize: 13,
    minHeight: 70,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#334155',
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
    backgroundColor: '#1E293B',
    alignItems: 'center',
  },
  cancelText: {
    color: '#94A3B8',
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
    backgroundColor: '#DC2626',
  },
  submitText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
