import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthColorsTheme } from '@/constants/authTheme';
import { ProfileBackgroundImages } from '@/constants/profileTheme';

type Props = {
  theme: AuthColorsTheme;
};

/**
 * Full-bleed Stitch atmospheric wallpaper behind the Profile screen.
 * Dark: deep navy map with teal/orange light trails.
 * Light: soft lavender/blue airy map with bokeh.
 * Gradient scrim keeps cards readable in both modes.
 */
export function ProfileBackground({ theme }: Props) {
  const isDark = theme === 'dark';

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={ProfileBackgroundImages[theme]}
        style={styles.image}
        resizeMode="cover"
      >
        <LinearGradient
          colors={
            isDark
              ? [
                  'rgba(11, 15, 25, 0.55)',
                  'rgba(11, 15, 25, 0.72)',
                  'rgba(11, 15, 25, 0.88)',
                ]
              : [
                  'rgba(248, 250, 252, 0.45)',
                  'rgba(241, 244, 249, 0.72)',
                  'rgba(241, 244, 249, 0.9)',
                ]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 0.6, y: 1 }}
          style={StyleSheet.absoluteFill}
        />

        {/* Soft accent orbs — match auth screens */}
        <View
          style={[
            styles.glowTop,
            {
              backgroundColor: isDark
                ? 'rgba(45, 212, 191, 0.12)'
                : 'rgba(129, 140, 248, 0.14)',
            },
          ]}
        />
        <View
          style={[
            styles.glowBottom,
            {
              backgroundColor: isDark
                ? 'rgba(255, 90, 54, 0.12)'
                : 'rgba(255, 90, 54, 0.1)',
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
  glowTop: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -110,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
});
