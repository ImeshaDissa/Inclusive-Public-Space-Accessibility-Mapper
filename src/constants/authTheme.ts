/**
 * Auth screen palette — InclusiveMapper designs.
 * Based on Davis Humphries Design palette from user reference:
 *   #050505 - Jet Black
 *   #610C27 - Rich Velvet Burgundy
 *   #AC9C8D - Warm Taupe
 *   #E3C1B4 - Peachy Blush
 *   #DDD9CE - Warm Pale Stone
 *   #EFECE9 - Soft Alabaster Cream
 */
import { ImageRequireSource } from 'react-native';

/** Map artwork used as the auth screens' background, per theme. */
export const AuthBackgroundImages: Record<AuthColorsTheme, ImageRequireSource> = {
  light: require('../../assets/images/auth/auth-map-light.png'),
  dark: require('../../assets/images/auth/auth-map-dark.png'),
};

export const AuthColors = {
  light: {
    canvas: '#EFECE9',
    card: '#FFFFFF',
    cardBorder: '#DDD9CE',
    inputBg: '#FAF8F6',
    inputBorder: '#AC9C8D',
    inputFocusBorder: '#610C27',
    inputFocusBg: '#FFFFFF',
    inputErrorBorder: '#8B1E2F',
    textPrimary: '#050505',
    textSecondary: '#4A3C38',
    textMuted: '#70625D',
    brand: '#610C27',
    brandDark: '#4A081D',
    brandSoft: '#F6ECE8',
    success: '#2D6A4F',
    successBg: '#EBF5F0',
    successBorder: 'rgba(45, 106, 79, 0.35)',
    error: '#8B1E2F',
    errorBg: '#FAEEEE',
    errorBorder: 'rgba(139, 30, 47, 0.35)',
    socialBtnBg: '#FAF8F6',
    socialBtnBorder: '#DDD9CE',
    appleIcon: '#050505',
    divider: '#DDD9CE',
    checkboxOffBorder: '#AC9C8D',
    link: '#610C27',
    backBtnBg: '#FFFFFF',
    backBtnText: '#4A3C38',
    badgeBg: 'rgba(255, 255, 255, 0.95)',
    badgeBorder: '#DDD9CE',
    badgeText: '#4A3C38',
    badgeIcon: '#2D6A4F',
    footerBg: 'rgba(255, 255, 255, 0.97)',
    footerBorder: '#DDD9CE',
  },
  dark: {
    canvas: '#050505',
    card: '#1A1215',
    cardBorder: '#302025',
    inputBg: '#22181D',
    inputBorder: '#453037',
    inputFocusBorder: '#E3C1B4',
    inputFocusBg: '#2D2026',
    inputErrorBorder: '#E56B6F',
    textPrimary: '#EFECE9',
    textSecondary: '#DDD9CE',
    textMuted: '#AC9C8D',
    brand: '#E3C1B4',
    brandDark: '#610C27',
    brandSoft: 'rgba(227, 193, 180, 0.18)',
    success: '#52B788',
    successBg: 'rgba(45, 106, 79, 0.35)',
    successBorder: 'rgba(82, 183, 136, 0.4)',
    error: '#E56B6F',
    errorBg: 'rgba(139, 30, 47, 0.35)',
    errorBorder: 'rgba(229, 107, 111, 0.4)',
    socialBtnBg: '#22181D',
    socialBtnBorder: '#38252C',
    appleIcon: '#EFECE9',
    divider: '#38252C',
    checkboxOffBorder: '#AC9C8D',
    link: '#E3C1B4',
    backBtnBg: '#1A1215',
    backBtnText: '#DDD9CE',
    badgeBg: 'rgba(26, 18, 21, 0.95)',
    badgeBorder: '#302025',
    badgeText: '#DDD9CE',
    badgeIcon: '#52B788',
    footerBg: 'rgba(26, 18, 21, 0.97)',
    footerBorder: '#302025',
  },
} as const;

export type AuthColorsTheme = keyof typeof AuthColors;
