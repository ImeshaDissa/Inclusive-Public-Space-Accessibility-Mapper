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
  useAuthColors,
} from '@/components/auth/AuthKit';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { showToast } = useToast();
  const c = useAuthColors(theme);
  const { authReady, isAuthenticated, signIn } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
          contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Floating card */}
          <View style={[styles.cardWrapper, { flexGrow: 1, justifyContent: 'center' }]}>
            <View
              style={[
                styles.card,
                { backgroundColor: c.card, borderColor: c.cardBorder },
              ]}
            >
              {/* Welcome header */}
              <View style={styles.header}>
                <Text style={[styles.headerWelcome, { color: c.textPrimary }]}>Welcome to</Text>
                <Text style={[styles.headerTitle, { color: c.textPrimary }]}>InclusiveMapper login now!</Text>
              </View>

              {/* Email field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Email</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor: error && !email.trim() ? c.inputErrorBorder : c.inputBorder,
                    },
                  ]}
                >
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
                    onChangeText={(t) => { setEmail(t); setError(''); }}
                    onSubmitEditing={focusPasswordField}
                  />
                </View>
              </View>

              {/* Password field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor: error && !password.trim() ? c.inputErrorBorder : c.inputBorder,
                    },
                  ]}
                >
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
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
                    accessibilityState={{ selected: showPassword }}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={24}
                      color={c.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember me / Forgot password */}
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
                  onPress={() => showToast('Password recovery is not available in the local demo.', 'info')}
                  accessibilityRole="link"
                  accessibilityLabel="Forgot password"
                >
                  <Text style={[styles.forgotText, { color: c.link }]}>Forgot password?</Text>
                </TouchableOpacity>
              </View>

              {/* Error message */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
                  <Ionicons name="alert-circle" size={16} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              )}

              {/* Sign In button */}
              <TouchableOpacity
                style={[styles.signInBtn, { backgroundColor: c.brand }, loading && { opacity: 0.7 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signInBtnText}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider + social row */}
              <View style={styles.dividerWrap}>
                <AuthDivider c={c} />
                <AuthSocialRow c={c} />
              </View>
            </View>
          </View>

          {/* Footer */}
          <View style={[styles.footer, { backgroundColor: c.footerBg, borderColor: c.footerBorder }]}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: c.textPrimary }]}>Don&apos;t have an account?</Text>
              <TouchableOpacity
                onPress={() => router.replace('/signup')}
                accessibilityRole="link"
                accessibilityLabel="Create a new account"
                hitSlop={8}
              >
                <Text style={[styles.footerLink, { color: c.link, textDecorationLine: 'underline' }]}>
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
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  card: {
    borderRadius: 32,
    borderWidth: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  headerWelcome: {
    fontSize: 17,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
    marginTop: 2,
  },
  inputGroup: {
    gap: 7,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    height: 56,
  },
  inputField: {
    flex: 1,
    fontSize: 17,
    fontWeight: '500',
    paddingVertical: 0,
  },
  eyeBtn: {
    padding: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
    marginBottom: 14,
    paddingHorizontal: 2,
  },
  rememberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 15,
    fontWeight: '600',
  },
  forgotText: {
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
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
    height: 56,
    minHeight: 48,
    borderRadius: 16,
  },
  signInBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  dividerWrap: {
    marginTop: 22,
    gap: 14,
  },
  footer: {
    gap: 12,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  footerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  footerLink: {
    fontSize: 16,
    fontWeight: '800',
  },
});
