import React from 'react';
import { ImageBackground, StyleSheet, View } from 'react-native';
import {
  AuthBackgroundImages,
  AuthColorsTheme,
} from '@/constants/authTheme';

type Props = {
  theme: AuthColorsTheme;
};

/**
 * Full-screen map artwork behind the auth screens, matching the Stitch designs:
 * - Light: blueprint map blended into the canvas at ~20% opacity (multiply feel)
 * - Dark:  glowing cyber-cartography map at ~80% opacity with a dark scrim on
 *          top/bottom so text and cards stay readable.
 */
export function AuthBackground({ theme }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <ImageBackground
        source={AuthBackgroundImages[theme]}
        style={styles.image}
        resizeMode="cover"
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            theme === 'light' ? styles.scrimLight : styles.scrimDark,
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
  scrimLight: {
    backgroundColor: 'rgba(241, 244, 249, 0.9)',
  },
  scrimDark: {
    backgroundColor: 'rgba(11, 15, 25, 0.55)',
  },
});
