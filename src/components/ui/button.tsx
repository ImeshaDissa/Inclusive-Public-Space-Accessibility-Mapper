import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { cva, type VariantProps } from 'class-variance-authority';
import { useAppTheme } from '@/context/ThemeContext';

export const buttonVariants = cva('inline-flex items-center justify-center rounded-md text-sm font-medium', {
  variants: {
    variant: {
      default: 'bg-primary text-primary-foreground hover:bg-primary/90',
      destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
      ghost: 'hover:bg-accent hover:text-accent-foreground',
      link: 'text-primary underline-offset-4 hover:underline',
      success: 'bg-emerald-600 text-white',
    },
    size: {
      default: 'h-10 px-4 py-2',
      sm: 'h-9 rounded-md px-3',
      lg: 'h-11 rounded-md px-8',
      icon: 'h-10 w-10',
    },
  },
  defaultVariants: {
    variant: 'default',
    size: 'default',
  },
});

export interface ButtonProps
  extends TouchableOpacityProps,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
  title?: string;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export const Button = React.forwardRef<View, ButtonProps>(
  (
    {
      variant = 'default',
      size = 'default',
      title,
      children,
      loading = false,
      disabled = false,
      style,
      textStyle,
      icon,
      activeOpacity = 0.8,
      ...props
    },
    ref
  ) => {
    const { colors, isDark } = useAppTheme();

    const getVariantStyles = (): { bg: ViewStyle; text: TextStyle; border?: ViewStyle } => {
      switch (variant) {
        case 'destructive':
          return {
            bg: { backgroundColor: colors.error || '#EF4444' },
            text: { color: '#FFFFFF' },
          };
        case 'outline':
          return {
            bg: { backgroundColor: 'transparent' },
            border: { borderWidth: 1.5, borderColor: colors.cardBorder || '#334155' },
            text: { color: colors.textPrimary },
          };
        case 'secondary':
          return {
            bg: { backgroundColor: colors.chipBg || '#1E293B' },
            border: { borderWidth: 1, borderColor: colors.chipBorder || 'transparent' },
            text: { color: colors.textPrimary },
          };
        case 'ghost':
          return {
            bg: { backgroundColor: 'transparent' },
            text: { color: colors.textPrimary },
          };
        case 'link':
          return {
            bg: { backgroundColor: 'transparent' },
            text: { color: colors.accent, textDecorationLine: 'underline' },
          };
        case 'success':
          return {
            bg: { backgroundColor: colors.statusDotVerified || '#10B981' },
            text: { color: '#FFFFFF' },
          };
        case 'default':
        default:
          return {
            bg: { backgroundColor: colors.accent || '#FF5A36' },
            text: { color: '#FFFFFF' },
          };
      }
    };

    const getSizeStyles = (): { btn: ViewStyle; text: TextStyle } => {
      switch (size) {
        case 'sm':
          return {
            btn: { paddingHorizontal: 12, paddingVertical: 6, minHeight: 36, borderRadius: 8 },
            text: { fontSize: 12, fontWeight: '700' },
          };
        case 'lg':
          return {
            btn: { paddingHorizontal: 24, paddingVertical: 14, minHeight: 52, borderRadius: 14 },
            text: { fontSize: 16, fontWeight: '800' },
          };
        case 'icon':
          return {
            btn: { width: 42, height: 42, padding: 0, borderRadius: 21, justifyContent: 'center', alignItems: 'center' },
            text: { fontSize: 14 },
          };
        case 'default':
        default:
          return {
            btn: { paddingHorizontal: 16, paddingVertical: 10, minHeight: 44, borderRadius: 12 },
            text: { fontSize: 14, fontWeight: '700' },
          };
      }
    };

    const vStyle = getVariantStyles();
    const sStyle = getSizeStyles();

    return (
      <TouchableOpacity
        ref={ref}
        disabled={disabled || loading}
        activeOpacity={activeOpacity}
        style={[
          styles.baseButton,
          vStyle.bg,
          vStyle.border,
          sStyle.btn,
          disabled && styles.disabled,
          style,
        ]}
        {...props}
      >
        {loading ? (
          <ActivityIndicator size="small" color={vStyle.text.color} />
        ) : (
          <>
            {icon && icon}
            {title ? (
              <Text style={[styles.baseText, vStyle.text, sStyle.text, textStyle]}>{title}</Text>
            ) : typeof children === 'string' ? (
              <Text style={[styles.baseText, vStyle.text, sStyle.text, textStyle]}>{children}</Text>
            ) : (
              children
            )}
          </>
        )}
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = StyleSheet.create({
  baseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  baseText: {
    letterSpacing: 0.2,
  },
  disabled: {
    opacity: 0.5,
  },
});
