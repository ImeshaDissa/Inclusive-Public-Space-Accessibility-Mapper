import { Platform, Alert } from 'react-native';

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

      const cleanup = () => {
        try {
          if (input.parentNode) {
            input.parentNode.removeChild(input);
          }
        } catch (e) {
          // ignore
        }
      };

      input.onchange = (event: any) => {
        const file = event.target?.files?.[0];
        if (!file) {
          cleanup();
          resolve(null);
          return;
        }

        // Limit to 15MB
        if (file.size > 15 * 1024 * 1024) {
          alert('Image size exceeds 15MB limit. Please select a smaller photo.');
          cleanup();
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
          cleanup();
          const result = e.target?.result as string;
          resolve(result || null);
        };
        reader.onerror = (err) => {
          console.warn('FileReader error, falling back to Blob URL:', err);
          cleanup();
          try {
            const blobUrl = URL.createObjectURL(file);
            resolve(blobUrl);
          } catch (e) {
            resolve(null);
          }
        };
        reader.readAsDataURL(file);
      };

      input.oncancel = () => {
        cleanup();
        resolve(null);
      };

      document.body.appendChild(input);
      input.click();
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
    Alert.alert(
      'Image Picker on Mobile',
      'To select images from a native phone gallery, install expo-image-picker (npx expo install expo-image-picker). On web browsers, device file upload works directly.'
    );
  }

  return null;
}
