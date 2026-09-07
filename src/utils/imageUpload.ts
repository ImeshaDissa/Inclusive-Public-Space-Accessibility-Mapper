import { Platform } from 'react-native';

/**
 * Universal device image picker.
 * Opens the device's native file picker / gallery to allow selecting a real image file.
 * Returns the base64 Data URL or file URI of the chosen image, or null if cancelled.
 */
export async function pickImageFromDevice(): Promise<string | null> {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';

      input.onchange = (event: any) => {
        const file = event.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        // Limit to 10MB to avoid excessive memory usage
        if (file.size > 10 * 1024 * 1024) {
          alert('Image size exceeds 10MB limit. Please select a smaller photo.');
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          const result = e.target?.result as string;
          resolve(result || null);
        };
        reader.onerror = () => {
          resolve(null);
        };
        reader.readAsDataURL(file);
      };

      input.oncancel = () => {
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    });
  }

  // Native fallback (attempts to dynamically load expo-image-picker if installed)
  try {
    const ImagePicker = require('expo-image-picker');
    if (ImagePicker && ImagePicker.launchImageLibraryAsync) {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'Images',
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        return result.assets[0].uri;
      }
    }
  } catch (e) {
    // expo-image-picker not installed
  }

  return null;
}
