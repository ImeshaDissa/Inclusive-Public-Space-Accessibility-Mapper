import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

export interface BadgeProps {
  children?: React.ReactNode;
  label?: string;
  variant?: BadgeVariant;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Badge({
  children,
  label,
  variant = 'default',
  style,
  textStyle,
  icon,
}: BadgeProps) {
  const { colors } = useAppTheme();

  const getVariantStyles = (): { bg: ViewStyle; text: TextStyle; border?: ViewStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          bg: { backgroundColor: colors.chipBg || '#1E293B' },
          border: { borderWidth: 1, borderColor: colors.chipBorder || 'transparent' },
          text: { color: colors.textSecondary },
        };
      case 'destructive':
        return {
          bg: { backgroundColor: colors.badgeDisputedBg || 'rgba(239, 68, 68, 0.15)' },
          border: { borderWidth: 1, borderColor: colors.statusDotDisputed || '#EF4444' },
          text: { color: colors.badgeDisputedText || '#EF4444' },
        };
      case 'outline':
        return {
          bg: { backgroundColor: 'transparent' },
          border: { borderWidth: 1, borderColor: colors.cardBorder || '#334155' },
          text: { color: colors.textPrimary },
        };
      case 'success':
        return {
          bg: { backgroundColor: colors.badgeVerifiedBg || 'rgba(16, 185, 129, 0.15)' },
          border: { borderWidth: 1, borderColor: colors.statusDotVerified || '#10B981' },
          text: { color: colors.badgeVerifiedText || '#10B981' },
        };
      case 'warning':
        return {
          bg: { backgroundColor: colors.badgePendingBg || 'rgba(245, 158, 11, 0.15)' },
          border: { borderWidth: 1, borderColor: colors.statusDotPending || '#F59E0B' },
          text: { color: colors.badgePendingText || '#F59E0B' },
        };
      case 'default':
      default:
        return {
          bg: { backgroundColor: 'rgba(255, 90, 54, 0.15)' },
          border: { borderWidth: 1, borderColor: '#FF5A36' },
          text: { color: '#FF7A5C' },
        };
    }
  };

  const vStyle = getVariantStyles();

  return (
    <View style={[styles.badge, vStyle.bg, vStyle.border, style]}>
      {icon && icon}
      {label ? (
        <Text style={[styles.badgeText, vStyle.text, textStyle]}>{label}</Text>
      ) : typeof children === 'string' ? (
        <Text style={[styles.badgeText, vStyle.text, textStyle]}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
