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
import {
  AuthDivider,
  AuthSocialRow,
  AuthCheckbox,
  useAuthColors,
} from '@/components/auth/AuthKit';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const c = useAuthColors(theme);
  const { authReady, isAuthenticated, signUp } = useApp();
  const scrollRef = useRef<ScrollView>(null);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;

  const handleSignUp = async () => {
    setError('');

    if (!name.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!agreedToTerms) {
      setError('Please agree to the Terms of Service & Privacy Policy.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await signUp({ name, email, password });
      if (!result.success) {
        setError(result.message || 'Unable to create account.');
        return;
      }

      router.replace('/map');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const focusField = (ref: React.RefObject<TextInput | null>) => {
    setTimeout(() => {
      ref.current?.focus();
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
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: c.textPrimary }]}>Create an Account</Text>
                <Text style={[styles.headerSubtitle, { color: c.textMuted }]}>Join as an accessibility auditor</Text>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Full Name</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <TextInput
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="Enter full name"
                    placeholderTextColor={c.textMuted}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    value={name}
                    onChangeText={(t) => { setName(t); setError(''); }}
                    onSubmitEditing={() => focusField(emailRef)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Email</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <TextInput
                    ref={emailRef}
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
                    onSubmitEditing={() => focusField(passwordRef)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Password</Text>
                <View style={[styles.inputRow, { backgroundColor: c.inputBg, borderColor: c.inputBorder }]}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="Min. 6 characters"
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPassword}
                    returnKeyType="next"
                    value={password}
                    onChangeText={(t) => { setPassword(t); setError(''); }}
                    onSubmitEditing={() => focusField(confirmRef)}
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

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <View style={styles.confirmLabelRow}>
                  <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Confirm Password</Text>
                  {passwordsMatch && (
                    <View style={[styles.matchPill, { backgroundColor: c.successBg, borderColor: c.successBorder }]}>
                      <Ionicons name="checkmark" size={11} color={c.success} />
                      <Text style={[styles.matchPillText, { color: c.success }]}>Match</Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        confirmPassword.length > 0 && password !== confirmPassword
                          ? c.inputErrorBorder
                          : c.inputBorder,
                    },
                  ]}
                >
                  <TextInput
                    ref={confirmRef}
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="Repeat your password"
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    value={confirmPassword}
                    onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                    onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                    onSubmitEditing={handleSignUp}
                  />
                </View>
              </View>

              {/* Terms checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => { setAgreedToTerms(!agreedToTerms); setError(''); }}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
              >
                <AuthCheckbox checked={agreedToTerms} onToggle={() => { setAgreedToTerms(!agreedToTerms); setError(''); }} c={c} />
                <Text style={[styles.termsText, { color: c.textMuted }]}>
                  I agree to the <Text style={{ color: c.link, fontWeight: '600' }}>Terms of Service</Text> &{' '}
                  <Text style={{ color: c.link, fontWeight: '600' }}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Error message */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
                  <Ionicons name="alert-circle" size={16} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              )}

              {/* Create Account button */}
              <TouchableOpacity
                style={[styles.signUpBtn, { backgroundColor: c.brand }, loading && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signUpBtnText}>Create Account</Text>
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
              <Text style={[styles.footerText, { color: c.textPrimary }]}>Already have an account?</Text>
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                accessibilityRole="link"
                accessibilityLabel="Go to sign in"
                hitSlop={8}
              >
                <Text style={[styles.footerLink, { color: c.link, textDecorationLine: 'underline' }]}>
                  Sign In
                </Text>
              </TouchableOpacity>
            </View>
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
    borderRadius: 28,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 2,
  },
  inputGroup: {
    gap: 7,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 2,
  },
  confirmLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  matchPillText: {
    fontSize: 12,
    fontWeight: '800',
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 2,
    marginBottom: 14,
    paddingHorizontal: 2,
    paddingVertical: 6,
  },
  termsText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
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
  signUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 56,
    minHeight: 48,
    borderRadius: 16,
  },
  signUpBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerWrap: {
    marginTop: 18,
    gap: 14,
  },
  footer: {
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
