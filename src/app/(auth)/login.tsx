import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import {
  AuthDivider,
  AuthSocialRow,
  AuthCheckbox,
  AuthStatusBadge,
  AuthTopBar,
  useAuthColors,
} from '@/components/auth/AuthKit';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const c = useAuthColors(theme);
  const { signIn } = useApp();

  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focusedInput, setFocusedInput] = useState<'email' | 'password' | null>(null);

  const handleLogin = async () => {
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setError('Please enter your password.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await signIn({ email, password });
      if (!result.success) {
        setError(result.message || 'Unable to sign in.');
        return;
      }

      router.replace('/map');
    } finally {
      setLoading(false);
    }
  };

  const focusPasswordField = () => {
    setTimeout(() => {
      passwordRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: c.canvas }]}>
      <AuthBackground theme={theme} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Math.max(insets.top + 4, 12), paddingBottom: Math.max(insets.bottom + 12, 20) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Bar with theme switch */}
          <AuthTopBar c={c} showBack={true} />

          {/* Floating Card Container */}
          <View style={styles.cardWrapper}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: c.card,
                  borderColor: c.cardBorder,
                },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerWelcome, { color: c.textMuted }]}>
                  Welcome back to
                </Text>
                <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
                  Inclusive<Text style={{ color: '#FF5A36' }}>Mapper</Text>
                </Text>
                <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                  Sign in to navigate & update accessible routes
                </Text>
              </View>

              {/* Email Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        error && !email.trim()
                          ? c.inputErrorBorder
                          : focusedInput === 'email'
                          ? '#FF5A36'
                          : c.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={focusedInput === 'email' ? '#FF5A36' : c.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="you@example.com"
                    placeholderTextColor={c.textMuted}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    textContentType="emailAddress"
                    returnKeyType="next"
                    value={email}
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError('');
                    }}
                    onSubmitEditing={focusPasswordField}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        error && !password.trim()
                          ? c.inputErrorBorder
                          : focusedInput === 'password'
                          ? '#FF5A36'
                          : c.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={20}
                    color={focusedInput === 'password' ? '#FF5A36' : c.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={passwordRef}
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="••••••••"
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType="password"
                    returnKeyType="done"
                    value={password}
                    onFocus={() => {
                      setFocusedInput('password');
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError('');
                    }}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={c.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  style={styles.rememberWrap}
                  onPress={() => setRememberMe(!rememberMe)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: rememberMe }}
                >
                  <AuthCheckbox checked={rememberMe} onToggle={() => setRememberMe(!rememberMe)} c={c} />
                  <Text style={[styles.rememberText, { color: c.textSecondary }]}>Remember me</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => showToast('Password recovery link sent to your email.', 'info')}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={[styles.forgotText, { color: '#FF5A36' }]}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Error Message */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
                  <Ionicons name="alert-circle" size={18} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              )}

              {/* Sign In Button */}
              <TouchableOpacity
                style={[styles.signInBtn, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Sign in"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider + Social Buttons */}
              <View style={styles.dividerWrap}>
                <AuthDivider c={c} />
                <AuthSocialRow c={c} />
              </View>
            </View>
          </View>

          {/* Footer Card */}
          <View style={[styles.footer, { backgroundColor: c.footerBg, borderColor: c.footerBorder }]}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: c.textPrimary }]}>
                Don&apos;t have an account?
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/signup')}
                accessibilityRole="link"
                accessibilityLabel="Create a new account"
                hitSlop={8}
              >
                <Text style={styles.footerLink}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>
            <AuthStatusBadge c={c} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  cardWrapper: {
    paddingHorizontal: 2,
    paddingVertical: 10,
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 22,
    paddingVertical: 26,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
      web: {
        boxShadow: '0 12px 32px -4px rgba(15, 23, 42, 0.12)',
      },
    }),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerWelcome: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginTop: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 6,
    textAlign: 'center',
  },
  inputGroup: {
    gap: 6,
    marginBottom: 16,
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
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 6,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
    marginBottom: 18,
    paddingHorizontal: 2,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 14,
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 14,
    fontWeight: '700',
  },
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
  signInBtn: {
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
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerWrap: {
    marginTop: 22,
    gap: 16,
  },
  footer: {
    gap: 12,
    marginHorizontal: 4,
    marginTop: 10,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerText: {
    fontSize: 14,
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FF5A36',
    textDecorationLine: 'underline',
  },
});
