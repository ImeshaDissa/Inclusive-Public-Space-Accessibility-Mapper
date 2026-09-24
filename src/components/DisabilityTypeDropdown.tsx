import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuthColors } from '@/components/auth/AuthKit';
import { DISABILITY_TYPES } from '@/constants/profile';

interface DisabilityTypeDropdownProps {
  value: string;
  onChange: (next: string) => void;
}

/**
 * Bottom-sheet dropdown for choosing a disability type.
 * Styled with the same auth theme as Login/Signup.
 * Includes an "Other" option that reveals a custom text input.
 */
export function DisabilityTypeDropdown({ value, onChange }: DisabilityTypeDropdownProps) {
  const { theme } = useAppTheme();
  const c = useAuthColors(theme);
  const [visible, setVisible] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [inputFocus, setInputFocus] = useState(false);

  const isPreset = DISABILITY_TYPES.includes(value);
  const isCustom = !!value && !isPreset;

  useEffect(() => {
    if (visible) {
      setCustomMode(isCustom);
      setCustomText(isCustom ? value : '');
      setInputFocus(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectType = (type: string) => {
    onChange(type);
    setVisible(false);
  };

  const saveCustom = () => {
    const trimmed = customText.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setVisible(false);
  };

  return (
    <>
      {/* Trigger button — mirrors auth inputRow style */}
      <TouchableOpacity
        style={[styles.trigger, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Disability type: ${value || 'not set'}. Tap to change.`}
      >
        <View style={styles.triggerLeft}>
          <Ionicons name="accessibility-outline" size={18} color="#FF5A36" />
          <Text style={[styles.triggerValue, { color: c.textPrimary }]} numberOfLines={1}>
            {value || 'Select a type'}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={c.textSecondary} />
      </TouchableOpacity>

      {/* Bottom sheet */}
      <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {/* Grab handle */}
              <View style={[styles.grabHandle, { backgroundColor: c.divider }]} />

              {/* Header */}
              <View style={styles.headerRow}>
                <Text style={[styles.headerWelcome, { color: c.textMuted }]}>Tailor your navigation</Text>
                <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
                  Disability <Text style={{ color: '#FF5A36' }}>Type</Text>
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: c.backBtnBg, borderColor: c.cardBorder }]}
                  onPress={() => setVisible(false)}
                  accessibilityRole="button"
                  accessibilityLabel="Close disability type picker"
                  hitSlop={8}
                >
                  <Ionicons name="close" size={18} color={c.backBtnText} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
                {DISABILITY_TYPES.map((type) => {
                  const selected = !customMode && type === value;
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.optionRow,
                        selected && { backgroundColor: c.brandSoft },
                      ]}
                      onPress={() => selectType(type)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          { color: selected ? '#FF5A36' : c.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {type}
                      </Text>
                      {selected && <Ionicons name="checkmark-circle" size={20} color="#FF5A36" />}
                    </TouchableOpacity>
                  );
                })}

                {/* Other / custom entry */}
                <TouchableOpacity
                  style={[styles.optionRow, styles.optionRowLast, (customMode || isCustom) && { backgroundColor: c.brandSoft }]}
                  onPress={() => setCustomMode(true)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.optionText,
                      { color: customMode || isCustom ? '#FF5A36' : c.textPrimary },
                    ]}
                  >
                    Other (specify)
                  </Text>
                  {(customMode || isCustom) && <Ionicons name="checkmark-circle" size={20} color="#FF5A36" />}
                </TouchableOpacity>
              </ScrollView>

              {/* Custom input — mirrors auth inputRow style */}
              {customMode && (
                <View style={styles.customBox}>
                  <Text style={[styles.customLabel, { color: c.textSecondary }]}>Describe your access needs</Text>
                  <View
                    style={[
                      styles.customInputRow,
                      {
                        backgroundColor: c.inputBg,
                        borderColor: inputFocus ? '#FF5A36' : c.inputBorder,
                      },
                    ]}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={inputFocus ? '#FF5A36' : c.textMuted}
                      style={styles.customInputIcon}
                    />
                    <TextInput
                      style={[styles.customInput, { color: c.textPrimary }]}
                      value={customText}
                      onChangeText={setCustomText}
                      placeholder="e.g. Post-surgery limited mobility"
                      placeholderTextColor={c.textMuted}
                      maxLength={60}
                      onFocus={() => setInputFocus(true)}
                      onBlur={() => setInputFocus(false)}
                      onSubmitEditing={saveCustom}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity
                    style={[styles.customSaveBtn, !customText.trim() && { opacity: 0.5 }]}
                    onPress={saveCustom}
                    disabled={!customText.trim()}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.customSaveText}>Save</Text>
                    <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { flex: 1 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
    marginTop: 12,
  },
  triggerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  triggerValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '80%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 -12px 32px -4px rgba(15, 23, 42, 0.18)',
      },
    }),
  },
  grabHandle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    marginBottom: 14,
  },
  headerRow: {
    alignItems: 'center',
    marginBottom: 14,
  },
  headerWelcome: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  closeBtn: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { marginBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 2,
  },
  optionRowLast: { marginBottom: 0 },
  optionText: { fontSize: 14, fontWeight: '600', flex: 1, paddingRight: 8 },
  customBox: { marginTop: 10 },
  customLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
    marginLeft: 2,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  customInputIcon: { marginRight: 10 },
  customInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  customSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 9999,
    backgroundColor: '#FF5A36',
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#FF5A36',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px 0 rgba(255, 90, 54, 0.35)',
      },
    }),
  },
  customSaveText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
