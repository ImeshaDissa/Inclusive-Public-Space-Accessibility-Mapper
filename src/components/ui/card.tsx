import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

export interface CardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
}

export function Card({ children, style }: CardProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }, style]}>
      {children}
    </View>
  );
}

export function CardHeader({ children, style }: CardProps) {
  return <View style={[styles.cardHeader, style]}>{children}</View>;
}

export function CardTitle({ children, style, textStyle }: CardProps & { textStyle?: TextStyle }) {
  const { colors } = useAppTheme();
  return (
    <Text style={[styles.cardTitle, { color: colors.textPrimary }, textStyle]}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style, textStyle }: CardProps & { textStyle?: TextStyle }) {
  const { colors } = useAppTheme();
  return (
    <Text style={[styles.cardDescription, { color: colors.textSecondary }, textStyle]}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style }: CardProps) {
  return <View style={[styles.cardContent, style]}>{children}</View>;
}

export function CardFooter({ children, style }: CardProps) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.cardFooter, { borderTopColor: colors.divider || 'rgba(255,255,255,0.08)' }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    marginBottom: 12,
    gap: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  cardDescription: {
    fontSize: 12,
    lineHeight: 18,
  },
  cardContent: {
    gap: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
  },
});
