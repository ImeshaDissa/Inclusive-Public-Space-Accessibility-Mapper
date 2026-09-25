import { ImageRequireSource } from 'react-native';
import { AuthColorsTheme } from '@/constants/authTheme';

/** Stitch atmospheric wallpapers used as the Profile screen background. */
export const ProfileBackgroundImages: Record<AuthColorsTheme, ImageRequireSource> = {
  light: require('../../assets/images/profile/profile-bg-light.png'),
  dark: require('../../assets/images/profile/profile-bg-dark.png'),
};
