import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { AppleLogo, FacebookLogo, GoogleLogo } from './AuthBrandIcons';
import { AuthColors, AuthColorsTheme } from '@/constants/authTheme';
import { useAppTheme } from '@/context/ThemeContext';

export function useAuthColors(theme: AuthColorsTheme) {
  return AuthColors[theme];
}

/** Top bar with back button, brand logo badge, and theme switcher toggle. */
export function AuthTopBar({
  c,
  title = 'InclusiveMapper',
  showBack = true,
}: {
  c: ReturnType<typeof useAuthColors>;
  title?: string;
  showBack?: boolean;
}) {
  const router = useRouter();
  const { theme, toggleTheme } = useAppTheme();
  const isDark = theme === 'dark';

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/onboarding');
    }
  };

  return (
    <View style={styles.topBar}>
      {showBack ? (
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: c.backBtnBg, borderColor: c.cardBorder }]}
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          activeOpacity={0.8}
        >
          <Ionicons name="chevron-back" size={20} color={c.backBtnText} />
        </TouchableOpacity>
      ) : (
        <View style={styles.brandRow}>
          <LinearGradient
            colors={['#FF5A36', '#F43F5E', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <View style={styles.logoInner}>
              <Ionicons name="compass" size={16} color="#FF5A36" />
            </View>
          </LinearGradient>
          <Text style={[styles.brandTitle, { color: c.textPrimary }]}>
            Inclusive<Text style={{ color: '#FF5A36' }}>Mapper</Text>
          </Text>
        </View>
      )}

      {showBack && (
        <View style={styles.brandRow}>
          <LinearGradient
            colors={['#FF5A36', '#F43F5E', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <View style={styles.logoInner}>
              <Ionicons name="compass" size={14} color="#FF5A36" />
            </View>
          </LinearGradient>
          <Text style={[styles.brandTitleSmall, { color: c.textPrimary }]}>
            Inclusive<Text style={{ color: '#FF5A36' }}>Mapper</Text>
          </Text>
        </View>
      )}

      {/* Theme Switcher Toggle */}
      <TouchableOpacity
        style={[
          styles.themeTogglePill,
          {
            backgroundColor: isDark ? '#1E293B' : '#FFFFFF',
            borderColor: isDark ? '#334155' : '#CBD5E1',
          },
        ]}
        onPress={toggleTheme}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      >
        <Ionicons
          name={isDark ? 'sunny' : 'moon'}
          size={16}
          color={isDark ? '#F59E0B' : '#4F46E5'}
        />
        <Text
          style={[
            styles.themeToggleText,
            { color: isDark ? '#F8FAFC' : '#0F172A' },
          ]}
        >
          {isDark ? 'Dark' : 'Light'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/** "Or Sign in with" divider line with centered label. */
export function AuthDivider({
  c,
  label = 'Or continue with',
}: {
  c: ReturnType<typeof useAuthColors>;
  label?: string;
}) {
  return (
    <View style={styles.dividerRow}>
      <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
      <Text style={[styles.dividerLabel, { color: c.textMuted }]}>{label}</Text>
      <View style={[styles.dividerLine, { backgroundColor: c.divider }]} />
    </View>
  );
}

/** Facebook / Google / Apple button row. */
export function AuthSocialRow({ c }: { c: ReturnType<typeof useAuthColors> }) {
  return (
    <View style={styles.socialRow}>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Facebook"
      >
        <FacebookLogo size={22} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Google"
      >
        <GoogleLogo size={22} />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.socialBtn, { backgroundColor: c.socialBtnBg, borderColor: c.socialBtnBorder }]}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="Continue with Apple"
      >
        <AppleLogo size={22} color={c.appleIcon} />
      </TouchableOpacity>
    </View>
  );
}

/** Square checkbox used for "Remember me" and Terms agreement. */
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
          backgroundColor: checked ? '#FF5A36' : c.card,
          borderColor: checked ? '#FF5A36' : c.checkboxOffBorder,
        },
      ]}
      activeOpacity={0.7}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      hitSlop={8}
    >
      {checked && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
    </TouchableOpacity>
  );
}

/** Footer status badge indicator. */
export function AuthStatusBadge({ c }: { c: ReturnType<typeof useAuthColors> }) {
  return (
    <View style={[styles.badge, { backgroundColor: c.badgeBg, borderColor: c.badgeBorder }]}>
      <View style={[styles.badgeDot, { backgroundColor: '#10B981' }]} />
      <Text style={[styles.badgeText, { color: c.badgeText }]}>
        Public space accessibility database
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTitleSmall: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  themeTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
    borderWidth: 1,
  },
  themeToggleText: {
    fontSize: 13,
    fontWeight: '700',
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
    fontSize: 11,
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
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
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
