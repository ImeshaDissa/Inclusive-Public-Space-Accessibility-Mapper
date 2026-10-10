import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { useAuthColors } from '@/components/auth/AuthKit';
import { DisabilityTypeDropdown } from '@/components/DisabilityTypeDropdown';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

/**
 * Full profile editor — every field maps to a column in the Supabase
 * `public.profiles` table (or auth metadata):
 *
 *   avatar           -> storage bucket `avatars/<uid>/avatar.jpg` + profiles.avatar
 *   name             -> profiles.name
 *   email            -> auth email (read-only here)
 *   hasDisability    -> profiles.has_disability
 *   disabilityType   -> profiles.disability_type
 *   preferences      -> profiles.preferences (jsonb: requireRamp / requireElevator /
 *                       requireAccessibleToilet / requireStepFree)
 *
 * Styled with the Login/Signup auth theme (brand #FF5A36).
 */
export function EditProfileModal({ visible, onClose }: EditProfileModalProps) {
  const { theme } = useAppTheme();
  const c = useAuthColors(theme);
  const { userProfile, updateUserProfile, updateUserAvatar } = useApp();

  const [name, setName] = useState(userProfile.name);
  const [pickedUri, setPickedUri] = useState<string | null>(null);
  const [hasDisability, setHasDisability] = useState(userProfile.hasDisability);
  const [disabilityType, setDisabilityType] = useState(userProfile.disabilityType);
  const [preferences, setPreferences] = useState(userProfile.preferences);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedInput, setFocusedInput] = useState<'name' | null>(null);

  useEffect(() => {
    if (visible) {
      setName(userProfile.name);
      setPickedUri(null);
      setHasDisability(userProfile.hasDisability);
      setDisabilityType(userProfile.disabilityType);
      setPreferences(userProfile.preferences);
      setError(null);
      setFocusedInput(null);
    }
  }, [visible, userProfile]);

  const pickImage = async () => new Promise<void>((resolve) => {
    // Wrapped so we can await inside the press handler cleanly.
    (async () => {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Photo library permission is required to change your avatar.');
        resolve();
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets.length > 0) {
        setPickedUri(result.assets[0].uri);
        setError(null);
      }
      resolve();
    })();
  });

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Name cannot be empty.');
      return;
    }
    if (hasDisability && !disabilityType.trim()) {
      setError('Please choose a disability type.');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      // 1. Upload avatar to Supabase Storage first (needs the URL before profile update).
      if (pickedUri) {
        const res = await updateUserAvatar(pickedUri);
        if (!res.success) {
          setError(res.message || 'Avatar upload failed.');
          setSaving(false);
          return;
        }
      }

      // 2. Persist everything else to public.profiles.
      updateUserProfile({
        ...(trimmedName !== userProfile.name && { name: trimmedName }),
        ...(hasDisability !== userProfile.hasDisability && { hasDisability }),
        ...(disabilityType !== userProfile.disabilityType && { disabilityType }),
        ...(JSON.stringify(preferences) !== JSON.stringify(userProfile.preferences) && { preferences }),
      });

      setSaving(false);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save profile.');
      setSaving(false);
    }
  };

  const previewAvatar = pickedUri || userProfile.avatar;

  const togglePref = (key: keyof typeof preferences) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const prefRows: Array<{
    key: keyof typeof preferences;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
  }> = [
    { key: 'requireRamp', label: 'Require Wheelchair Ramp', icon: 'water-outline' },
    { key: 'requireElevator', label: 'Require Elevator Access', icon: 'arrow-up-circle-outline' },
    { key: 'requireAccessibleToilet', label: 'Require Accessible Restroom', icon: 'home-outline' },
    { key: 'requireStepFree', label: 'Require Step-Free Entrance', icon: 'footsteps-outline' },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <View style={[styles.sheet, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
            {/* Grab handle */}
            <View style={[styles.grabHandle, { backgroundColor: c.divider }]} />

            {/* Header */}
            <View style={styles.headerRow}>
              <Text style={[styles.headerWelcome, { color: c.textMuted }]}>Your account</Text>
              <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
                Edit <Text style={{ color: '#FF5A36' }}>Profile</Text>
              </Text>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: c.backBtnBg, borderColor: c.cardBorder }]}
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close profile editor"
                hitSlop={8}
              >
                <Ionicons name="close" size={18} color={c.backBtnText} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Avatar Picker */}
              <View style={styles.avatarSection}>
                <TouchableOpacity onPress={pickImage} style={styles.avatarWrap} activeOpacity={0.85}>
                  <Image source={{ uri: previewAvatar }} style={[styles.avatar, { borderColor: c.inputBorder }]} />
                  <View style={styles.avatarEditBadge}>
                    <Ionicons name="camera" size={13} color="#FFFFFF" />
                  </View>
                </TouchableOpacity>
                <Text style={[styles.avatarHint, { color: c.textMuted }]}>
                  Tap to choose a photo from your device
                </Text>
              </View>

              {/* Name Input — mirrors auth inputRow style */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Display Name</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        error && !name.trim()
                          ? c.inputErrorBorder
                          : focusedInput === 'name'
                          ? '#FF5A36'
                          : c.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="person-outline"
                    size={20}
                    color={focusedInput === 'name' ? '#FF5A36' : c.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.inputField, { color: c.textPrimary }]}
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor={c.textMuted}
                    maxLength={50}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                  />
                </View>
              </View>

              {/* Email (read-only — auth email) */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Email Address</Text>
                <View style={[styles.inputRow, styles.inputRowDisabled, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <Ionicons name="mail-outline" size={20} color={c.textMuted} style={styles.inputIcon} />
                  <TextInput
                    style={[styles.inputField, { color: c.textMuted }]}
                    value={userProfile.email}
                    editable={false}
                  />
                  <Ionicons name="lock-closed-outline" size={16} color={c.textMuted} />
                </View>
              </View>

              {/* Disability Status toggle */}
              <View style={[styles.disabilityCard, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
                <View style={styles.disabilityRow}>
                  <View style={styles.disabilityText}>
                    <Text style={[styles.disabilityTitle, { color: c.textPrimary }]}>Disability Status</Text>
                    <Text style={[styles.disabilitySub, { color: c.textMuted }]}>
                      Enables tailored step-free & accessible alerts
                    </Text>
                  </View>
                  <Switch
                    value={hasDisability}
                    onValueChange={setHasDisability}
                    trackColor={{ false: c.divider, true: '#FF5A36' }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {hasDisability && (
                  <DisabilityTypeDropdown value={disabilityType} onChange={setDisabilityType} />
                )}
              </View>

              {/* Accessibility Preferences */}
              <View style={[styles.prefCard, { backgroundColor: c.inputBg, borderColor: c.cardBorder }]}>
                <Text style={[styles.prefHeader, { color: c.textMuted }]}>ACCESSIBILITY PREFERENCES</Text>
                {prefRows.map((row, idx) => (
                  <View
                    key={row.key}
                    style={[styles.prefRow, idx < prefRows.length - 1 && { borderBottomColor: c.cardBorder, borderBottomWidth: 1 }]}
                  >
                    <View style={styles.prefLeft}>
                      <Ionicons name={row.icon} size={17} color="#FF5A36" />
                      <Text style={[styles.prefText, { color: c.textPrimary }]}>{row.label}</Text>
                    </View>
                    <Switch
                      value={preferences[row.key]}
                      onValueChange={() => togglePref(row.key)}
                      trackColor={{ false: c.divider, true: '#10B981' }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                ))}
              </View>

              {/* Error Message */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
                  <Ionicons name="alert-circle" size={18} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              )}

              {/* Save Button — mirrors auth signInBtn style */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Save profile changes"
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, justifyContent: 'flex-end' },
  overlay: { flex: 1 },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '90%',
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
    marginBottom: 18,
  },
  headerWelcome: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 24,
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
  avatarSection: { alignItems: 'center', marginBottom: 18 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 2 },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF5A36',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarHint: { fontSize: 12, fontWeight: '500', marginTop: 10 },
  inputGroup: {
    gap: 6,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    height: 52,
  },
  inputRowDisabled: { opacity: 0.65 },
  inputIcon: { marginRight: 10 },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  disabilityCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  disabilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  disabilityText: { flex: 1, paddingRight: 10 },
  disabilityTitle: { fontSize: 14, fontWeight: '800' },
  disabilitySub: { fontSize: 11, marginTop: 2 },
  prefCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  prefHeader: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  prefLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  prefText: { fontSize: 13, fontWeight: '600' },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 9999,
    backgroundColor: '#FF5A36',
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
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
