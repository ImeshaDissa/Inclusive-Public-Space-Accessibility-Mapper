import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useToast } from '@/context/ToastContext';
import { hapticMedium } from '@/lib/haptics';

interface VoiceTypingButtonProps {
  /** Called with the recognized words; callers append to the existing text. */
  onResult: (text: string) => void;
  /** BCP-47 code — 'en-US' by default, 'si-LK' for Sinhala. */
  lang?: string;
  accessibilityLabel?: string;
}

/**
 * The web build gets real dictation via the browser Speech API. Expo Go has
 * no native speech-to-text, so on phones this button points users at the
 * microphone key their keyboard already has.
 */
export const VoiceTypingButton: React.FC<VoiceTypingButtonProps> = ({
  onResult,
  lang = 'en-US',
  accessibilityLabel = 'Dictate — speak to type',
}) => {
  const { colors } = useAppTheme();
  const { showToast } = useToast();
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // Recognition may already be finished.
      }
    };
  }, []);

  const handlePress = () => {
    hapticMedium();
    if (Platform.OS !== 'web') {
      showToast(
        'Voice typing runs in the web version. On this phone, tap the microphone key on your keyboard instead.',
        'info',
        'mic'
      );
      return;
    }

    const g = globalThis as any;
    const SpeechRecognitionImpl = g.SpeechRecognition || g.webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      showToast('This browser does not support voice typing.', 'warning', 'mic');
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop?.();
      } catch {
        // Already stopped.
      }
      return;
    }

    const recognition = new SpeechRecognitionImpl();
    recognition.lang = lang;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event: any) => {
      const transcript = String(event?.results?.[0]?.[0]?.transcript ?? '').trim();
      if (transcript) onResult(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      showToast('I could not hear that. Try again in a quieter place.', 'warning', 'mic');
    };
    recognitionRef.current = recognition;
    setListening(true);
    try {
      recognition.start();
    } catch {
      setListening(false);
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={styles.btn}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={listening ? `${accessibilityLabel}, listening` : accessibilityLabel}
      accessibilityState={{ busy: listening }}
      accessibilityHint={
        Platform.OS === 'web'
          ? 'Starts dictation. Speak, then pause to finish.'
          : 'On phones, use the microphone key on the keyboard for voice typing.'
      }
    >
      <Ionicons
        name={listening ? 'mic' : 'mic-outline'}
        size={20}
        color={listening ? colors.error : colors.textMuted}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
