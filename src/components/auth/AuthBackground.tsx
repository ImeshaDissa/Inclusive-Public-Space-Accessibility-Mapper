import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthBackgroundImages, AuthColorsTheme } from '@/constants/authTheme';

type Props = {
  theme: AuthColorsTheme;
};

/**
 * Full-screen map artwork & rich gradient background behind auth screens.
 * - Dark Mode: Deep indigo/navy linear gradient background with ambient glow overlays.
 * - Light Mode: Soft blueprint canvas linear gradient background.
 */
export function AuthBackground({ theme }: Props) {
  const isDark = theme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={AuthBackgroundImages[theme]}
        style={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={
            isDark
              ? [
                  '#0B0F19',
                  'rgba(15, 23, 42, 0.88)',
                  'rgba(30, 27, 75, 0.92)',
                  '#0B0F19',
                ]
              : [
                  '#F8FAFC',
                  'rgba(239, 246, 255, 0.88)',
                  'rgba(241, 245, 249, 0.94)',
                  '#F8FAFC',
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Ambient Glow Accents */}
        <View
          style={[
            styles.glowOrbTop,
            {
              backgroundColor: isDark ? 'rgba(79, 70, 229, 0.22)' : 'rgba(99, 102, 241, 0.12)',
            },
          ]}
        />
        <View
          style={[
            styles.glowOrbBottom,
            {
              backgroundColor: isDark ? 'rgba(255, 90, 54, 0.18)' : 'rgba(255, 90, 54, 0.1)',
            },
          ]}
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    flex: 1,
  },
  glowOrbTop: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  glowOrbBottom: {
    position: 'absolute',
    bottom: -100,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
});
