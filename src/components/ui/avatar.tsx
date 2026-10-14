import React, { useState } from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface AvatarProps {
  src?: string;
  fallbackName?: string;
  size?: number;
  style?: ViewStyle;
}

export function Avatar({ src, fallbackName = 'User', size = 40, style }: AvatarProps) {
  const { colors } = useAppTheme();
  const [error, setError] = useState(false);

  const borderRadius = size / 2;
  const initials = fallbackName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: colors.chipBg || '#1E293B',
          borderColor: colors.cardBorder || '#334155',
        },
        style,
      ]}
    >
      {!error && src ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size, borderRadius }}
          onError={() => setError(true)}
        />
      ) : (
        <Text
          style={[
            styles.fallbackText,
            { color: colors.textPrimary, fontSize: Math.max(10, size * 0.4) },
          ]}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1,
  },
  fallbackText: {
    fontWeight: '800',
  },
});
