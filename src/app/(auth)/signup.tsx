import React, { useEffect, useRef, useState } from 'react';
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

export default function SignUpScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { authReady, isAuthenticated, signUp } = useApp();
  const { colors } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authReady && isAuthenticated) {
      router.replace('/map');
    }
  }, [authReady, isAuthenticated, router]);

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

  const focusPasswordField = () => {
    setTimeout(() => {
      passwordRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const focusConfirmField = () => {
    setTimeout(() => {
      confirmRef.current?.focus();
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Hero Header */}
          <View style={[styles.heroSection, { backgroundColor: colors.accent, paddingTop: insets.top + 16 }]}>
            <View style={styles.heroIconLarge}>
              <Ionicons name="person-add" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.heroAppName}>Join InclusiveMapper</Text>
            <Text style={styles.heroSubtext}>Create your local accessibility auditor account</Text>
          </View>

          {/* Form Card */}
          <View style={styles.formCard}>
            {/* Name Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Full Name</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="person-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  placeholder="Alex Morgan"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="words"
                  returnKeyType="next"
                  value={name}
                  onChangeText={(t) => { setName(t); setError(''); }}
                  onSubmitEditing={() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }}
                />
              </View>
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Email Address</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="mail-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  placeholder="you@example.com"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  returnKeyType="next"
                  value={email}
                  onChangeText={(t) => { setEmail(t); setError(''); }}
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  onSubmitEditing={focusPasswordField}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder }]}>
                <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="next"
                  value={password}
                  onChangeText={(t) => { setPassword(t); setError(''); }}
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  onSubmitEditing={focusConfirmField}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Confirm Password</Text>
              <View style={[styles.inputRow, { backgroundColor: colors.inputBg, borderColor: confirmPassword && password !== confirmPassword ? colors.error : colors.inputBorder }]}>
                <Ionicons name="shield-checkmark-outline" size={18} color={colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  ref={confirmRef}
                  style={[styles.inputField, { color: colors.textPrimary }]}
                  placeholder="Repeat your password"
                  placeholderTextColor={colors.textMuted}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  value={confirmPassword}
                  onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
                  onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })}
                  onSubmitEditing={handleSignUp}
                />
                {confirmPassword.length > 0 && (
                  <Ionicons
                    name={password === confirmPassword && password.length >= 6 ? 'checkmark-circle' : 'close-circle'}
                    size={18}
                    color={password === confirmPassword && password.length >= 6 ? colors.statusDotVerified : colors.error}
                  />
                )}
              </View>
            </View>

            {/* Password Strength Hints */}
            <View style={styles.hintsRow}>
              <View style={[styles.hint, { backgroundColor: password.length >= 6 ? colors.successBg : colors.chipBg }]}>
                <Ionicons
                  name={password.length >= 6 ? 'checkmark' : 'ellipse-outline'}
                  size={12}
                  color={password.length >= 6 ? colors.statusDotVerified : colors.textMuted}
                />
                <Text style={[styles.hintText, { color: password.length >= 6 ? colors.statusDotVerified : colors.textMuted }]}>
                  6+ chars
                </Text>
              </View>
              <View style={[styles.hint, { backgroundColor: password !== confirmPassword && confirmPassword.length > 0 ? colors.errorBg : colors.chipBg }]}>
                <Ionicons
                  name={password === confirmPassword && confirmPassword.length > 0 ? 'checkmark' : 'ellipse-outline'}
                  size={12}
                  color={password === confirmPassword && confirmPassword.length > 0 ? colors.statusDotVerified : colors.textMuted}
                />
                <Text style={[styles.hintText, { color: password === confirmPassword && confirmPassword.length > 0 ? colors.statusDotVerified : colors.textMuted }]}>
                  Match
                </Text>
              </View>
            </View>

            {/* Error Message */}
            {!!error && (
              <View style={[styles.errorBox, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
                <Ionicons name="alert-circle" size={16} color={colors.error} />
                <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
              </View>
            )}

            {/* Sign Up Button */}
            <TouchableOpacity
              style={[styles.signUpBtn, { backgroundColor: colors.accent }, loading && { opacity: 0.7 }]}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Text style={styles.signUpBtnText}>Create Account</Text>
                  <Ionicons name="arrow-forward" size={18} color="#FFF" />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.orDivider}>
              <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
              <Text style={[styles.orText, { color: colors.textMuted }]}>OR</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              style={[styles.loginBtn, { backgroundColor: colors.secondaryButtonBg, borderColor: colors.secondaryButtonBorder }]}
              onPress={() => router.push('/login')}
              activeOpacity={0.8}
            >
              <Ionicons name="log-in-outline" size={18} color={colors.accent} />
              <Text style={[styles.loginBtnText, { color: colors.accent }]}>Already have an account? Sign In</Text>
            </TouchableOpacity>

            {/* Footer */}
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              All data is stored locally on your device.
            </Text>
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
  },
  heroSection: {
    alignItems: 'center',
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroIconLarge: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroAppName: {
    color: '#FFF',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  heroSubtext: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    marginTop: 4,
  },
  formCard: {
    padding: 24,
    paddingTop: 24,
    gap: 14,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
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
  },
  eyeBtn: {
    padding: 4,
  },
  hintsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 11,
    fontWeight: '700',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
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
    height: 54,
    borderRadius: 14,
    marginTop: 4,
  },
  signUpBtnText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 4,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  orText: {
    fontSize: 12,
    fontWeight: '700',
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  loginBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  footerText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 4,
  },
});
