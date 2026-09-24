import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppleLogo, FacebookLogo, GoogleLogo } from './AuthBrandIcons';
import { AuthColors, AuthColorsTheme } from '@/constants/authTheme';

export function useAuthColors(theme: AuthColorsTheme) {
  return AuthColors[theme];
}

/** Top bar with round back button and centered brand title, per the designs. */
export function AuthTopBar({ c, title = 'InclusiveMapper' }: { c: ReturnType<typeof useAuthColors>; title?: string }) {
  const router = useRouter();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  return (
    <View style={styles.topBar}>
      <TouchableOpacity
        style={[styles.backBtn, { backgroundColor: c.backBtnBg, borderColor: c.cardBorder }]}
        onPress={goBack}
        accessibilityRole="button"
        accessibilityLabel="Go back"
        activeOpacity={0.8}
      >
        <Ionicons name="chevron-back" size={20} color={c.backBtnText} />
      </TouchableOpacity>
      <Text style={[styles.brandTitle, { color: c.brand }]}>{title}</Text>
      <View style={styles.backBtnPlaceholder} />
    </View>
  );
}

/** "Or Sign in with" divider line with centered label. */
export function AuthDivider({ c, label = 'Or Sign in with' }: { c: ReturnType<typeof useAuthColors>; label?: string }) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
      <Text style={[styles.dividerLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
    </View>
  );
}

/** Facebook / Google / Apple button row from the designs. */
export function AuthSocialRow({ c }: { c: ReturnType<typeof useAuthColors> }) {
  return (
    <View style={styles.socialRow}>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Facebook"
      >
        <FacebookLogo size={24} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <GoogleLogo size={24} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        <AppleLogo size={24} color={c.appleIcon} />
      </TouchableOpacity>
    </View>
  );
}

/** Small square checkbox used for "Remember me" and the Terms agreement. */
export function AuthCheckbox({
  checked,
  onToggle,
  c,
}: {
  checked: boolean;
  onToggle: () => void;
  c: ReturnType<typeof useAuthColors>;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.checkbox,
        {
          backgroundColor: checked ? c.brand : c.card,
          borderColor: checked ? c.brand : c.checkboxOffBorder,
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
    >
      {checked && <Ionicons name="checkmark" size={18} color="#FFFFFF" strokeWidth={3} />}
    </TouchableOpacity>
  );
}

/** Footer pill: "Public space accessibility database" indicator. */
export function AuthStatusBadge({ c }: { c: ReturnType<typeof useAuthColors> }) {
  return (
    <View style={[styles.badge, { backgroundColor: c.badgeBg, borderColor: c.badgeBorder }]}>
      <View style={[styles.badgeDot, { backgroundColor: c.badgeIcon }]} />
      <Text style={[styles.badgeText, { color: c.badgeText }]}>Public space accessibility database</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 38,
    height: 38,
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'center',
  },
  badgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
