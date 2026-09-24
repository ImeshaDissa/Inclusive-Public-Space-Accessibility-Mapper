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
  AuthStatusBadge,
  AuthTopBar,
  useAuthColors,
} from '@/components/auth/AuthKit';
import { AuthBackground } from '@/components/auth/AuthBackground';

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const c = useAuthColors(theme);
  const { signUp } = useApp();

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
  const [focusedInput, setFocusedInput] = useState<'name' | 'email' | 'password' | 'confirm' | null>(null);

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
            <View style={[styles.card, { backgroundColor: c.card, borderColor: c.cardBorder }]}>
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerWelcome, { color: c.textMuted }]}>
                  Join InclusiveMapper
                </Text>
                <Text style={[styles.headerTitle, { color: c.textPrimary }]}>
                  Create an Account
                </Text>
                <Text style={[styles.headerSubtitle, { color: c.textSecondary }]}>
                  Become a community auditor & accessibility navigator
                </Text>
              </View>

              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Full Name</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        focusedInput === 'name' ? '#FF5A36' : c.inputBorder,
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
                    placeholder="Jane Doe"
                    placeholderTextColor={c.textMuted}
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    value={name}
                    onFocus={() => setFocusedInput('name')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setName(t);
                      setError('');
                    }}
                    onSubmitEditing={() => focusField(emailRef)}
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Email Address</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        focusedInput === 'email' ? '#FF5A36' : c.inputBorder,
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
                    onFocus={() => setFocusedInput('email')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setEmail(t);
                      setError('');
                    }}
                    onSubmitEditing={() => focusField(passwordRef)}
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        focusedInput === 'password' ? '#FF5A36' : c.inputBorder,
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
                    placeholder="At least 6 characters"
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="next"
                    value={password}
                    onFocus={() => setFocusedInput('password')}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setPassword(t);
                      setError('');
                    }}
                    onSubmitEditing={() => focusField(confirmRef)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeBtn}
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

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: c.textSecondary }]}>Confirm Password</Text>
                <View
                  style={[
                    styles.inputRow,
                    {
                      backgroundColor: c.inputBg,
                      borderColor:
                        passwordsMatch
                          ? c.successBorder
                          : focusedInput === 'confirm'
                          ? '#FF5A36'
                          : c.inputBorder,
                    },
                  ]}
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={20}
                    color={passwordsMatch ? c.success : focusedInput === 'confirm' ? '#FF5A36' : c.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    ref={confirmRef}
                    style={[styles.inputField, { color: c.textPrimary }]}
                    placeholder="Re-enter password"
                    placeholderTextColor={c.textMuted}
                    secureTextEntry={!showPassword}
                    autoComplete="new-password"
                    textContentType="newPassword"
                    returnKeyType="done"
                    value={confirmPassword}
                    onFocus={() => {
                      setFocusedInput('confirm');
                      scrollRef.current?.scrollToEnd({ animated: true });
                    }}
                    onBlur={() => setFocusedInput(null)}
                    onChangeText={(t) => {
                      setConfirmPassword(t);
                      setError('');
                    }}
                    onSubmitEditing={handleSignUp}
                  />
                  {passwordsMatch && (
                    <Ionicons name="checkmark-circle" size={20} color={c.success} style={{ marginLeft: 6 }} />
                  )}
                </View>
              </View>

              {/* Terms Checkbox */}
              <TouchableOpacity
                style={styles.termsRow}
                onPress={() => setAgreedToTerms(!agreedToTerms)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: agreedToTerms }}
              >
                <AuthCheckbox checked={agreedToTerms} onToggle={() => setAgreedToTerms(!agreedToTerms)} c={c} />
                <Text style={[styles.termsText, { color: c.textSecondary }]}>
                  I agree to the{' '}
                  <Text style={styles.termsLink}>Terms of Service</Text> &{' '}
                  <Text style={styles.termsLink}>Privacy Policy</Text>
                </Text>
              </TouchableOpacity>

              {/* Error Message */}
              {!!error && (
                <View style={[styles.errorBox, { backgroundColor: c.errorBg, borderColor: c.errorBorder }]}>
                  <Ionicons name="alert-circle" size={18} color={c.error} />
                  <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
                </View>
              )}

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
                onPress={handleSignUp}
                disabled={loading}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Create account"
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text style={styles.signUpBtnText}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>

              {/* Divider + Social Buttons */}
              <View style={styles.dividerWrap}>
                <AuthDivider c={c} label="Or register with" />
                <AuthSocialRow c={c} />
              </View>
            </View>
          </View>

          {/* Footer Card */}
          <View style={[styles.footer, { backgroundColor: c.footerBg, borderColor: c.footerBorder }]}>
            <View style={styles.footerRow}>
              <Text style={[styles.footerText, { color: c.textPrimary }]}>
                Already have an account?
              </Text>
              <TouchableOpacity
                onPress={() => router.replace('/login')}
                accessibilityRole="link"
                accessibilityLabel="Sign in to existing account"
                hitSlop={8}
              >
                <Text style={styles.footerLink}>
                  Sign In
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
    marginBottom: 20,
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
  termsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 16,
    paddingHorizontal: 2,
  },
  termsText: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
    lineHeight: 18,
  },
  termsLink: {
    fontWeight: '700',
    color: '#FF5A36',
    textDecorationLine: 'underline',
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
  signUpBtn: {
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
  signUpBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dividerWrap: {
    marginTop: 20,
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
