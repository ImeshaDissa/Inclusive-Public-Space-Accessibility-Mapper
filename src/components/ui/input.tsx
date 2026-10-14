import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
  icon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    {
      label,
      error,
      containerStyle,
      inputStyle,
      icon,
      rightIcon,
      onFocus,
      onBlur,
      ...props
    },
    ref
  ) => {
    const { colors } = useAppTheme();
    const [isFocused, setIsFocused] = useState(false);

    return (
      <View style={[styles.container, containerStyle]}>
        {label && (
          <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        )}
        <View
          style={[
            styles.inputRow,
            {
              backgroundColor: colors.chipBg || '#1E293B',
              borderColor: error
                ? colors.error || '#EF4444'
                : isFocused
                ? colors.accent || '#FF5A36'
                : colors.chipBorder || '#334155',
            },
          ]}
        >
          {icon && <View style={styles.iconWrap}>{icon}</View>}
          <TextInput
            ref={ref}
            style={[styles.input, { color: colors.textPrimary }, inputStyle]}
            placeholderTextColor={colors.textMuted || '#64748B'}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...props}
          />
          {rightIcon && <View style={styles.iconWrap}>{rightIcon}</View>}
        </View>
        {error && (
          <Text style={[styles.errorText, { color: colors.error || '#EF4444' }]}>
            {error}
          </Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    minHeight: 46,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    paddingVertical: 8,
  },
  iconWrap: {
    marginRight: 8,
  },
  errorText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 2,
    marginTop: 2,
  },
});
