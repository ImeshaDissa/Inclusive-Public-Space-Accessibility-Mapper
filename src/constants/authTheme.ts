/**
 * Auth screen palette — InclusiveMapper designs (Stitch).
 * Light: canvas #F1F4F9, card #FFFFFF, input #F4F6FA, brand #2563EB
 * Dark:  canvas #0B0F19, card #151C2C, input #1E293B, brand #2563EB / #60A5FA
 */
import { ImageRequireSource } from 'react-native';

/** Map artwork used as the auth screens' background, per theme. */
export const AuthBackgroundImages: Record<AuthColorsTheme, ImageRequireSource> = {
  light: require('../../assets/images/auth/auth-map-light.png'),
  dark: require('../../assets/images/auth/auth-map-dark.png'),
};

export const AuthColors = {
  light: {
    canvas: '#F1F4F9',
    card: '#FFFFFF',
    cardBorder: 'rgba(100, 116, 139, 0.35)',
    inputBg: '#F4F6FA',
    inputBorder: '#64748B',
    inputFocusBorder: '#2563EB',
    inputFocusBg: '#FFFFFF',
    inputErrorBorder: '#DC2626',
    textPrimary: '#0F172A',
    textSecondary: '#334155',
    textMuted: '#64748B',
    brand: '#2563EB',
    brandDark: '#1D4ED8',
    brandSoft: '#EFF6FF',
    success: '#059669',
    successBg: '#ECFDF5',
    successBorder: 'rgba(16, 185, 129, 0.35)',
    error: '#DC2626',
    errorBg: '#FEF2F2',
    errorBorder: 'rgba(220, 38, 38, 0.35)',
    socialBtnBg: '#F4F6FA',
    socialBtnBorder: 'rgba(148, 163, 184, 0.35)',
    appleIcon: '#0F172A',
    divider: '#94A3B8',
    checkboxOffBorder: '#64748B',
    link: '#1D4ED8',
    backBtnBg: '#FFFFFF',
    backBtnText: '#334155',
    badgeBg: 'rgba(255, 255, 255, 0.95)',
    badgeBorder: 'rgba(100, 116, 139, 0.5)',
    badgeText: '#334155',
    badgeIcon: '#10B981',
    footerBg: 'rgba(255, 255, 255, 0.97)',
    footerBorder: 'rgba(100, 116, 139, 0.4)',
  },
  dark: {
    canvas: '#0B0F19',
    card: '#151C2C',
    cardBorder: '#26334D',
    inputBg: '#1E293B',
    inputBorder: '#64748B',
    inputFocusBorder: '#93C5FD',
    inputFocusBg: '#233044',
    inputErrorBorder: '#F87171',
    textPrimary: '#F8FAFC',
    textSecondary: '#E2E8F0',
    textMuted: '#94A3B8',
    brand: '#2563EB',
    brandDark: '#1D4ED8',
    brandSoft: 'rgba(37, 99, 235, 0.18)',
    success: '#34D399',
    successBg: 'rgba(6, 78, 59, 0.6)',
    successBorder: 'rgba(52, 211, 153, 0.3)',
    error: '#F87171',
    errorBg: 'rgba(127, 29, 29, 0.35)',
    errorBorder: 'rgba(239, 68, 68, 0.35)',
    socialBtnBg: '#1E293B',
    socialBtnBorder: '#334155',
    appleIcon: '#F8FAFC',
    divider: '#475569',
    checkboxOffBorder: '#94A3B8',
    link: '#93C5FD',
    backBtnBg: '#151C2C',
    backBtnText: '#E2E8F0',
    badgeBg: 'rgba(15, 23, 42, 0.95)',
    badgeBorder: '#475569',
    badgeText: '#CBD5E1',
    badgeIcon: '#34D399',
    footerBg: 'rgba(15, 23, 42, 0.97)',
    footerBorder: '#475569',
  },
} as const;

export type AuthColorsTheme = keyof typeof AuthColors;
