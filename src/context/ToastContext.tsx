import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity, AccessibilityInfo, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastData {
  message: string;
  type: ToastType;
  icon?: string;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType, icon?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Long enough for screen-reader users to hear the message and for anyone
// with tremors or slow touch to reach the toast before it disappears.
const TOAST_DURATION = 8000;

/**
 * Solid dark cards read clearly on both light and dark themes (the old info
 * style was a translucent orange tint with near-white text — invisible in
 * light mode). Each type gets its own tinted chip + progress bar.
 */
const getConfig = (type: ToastType) => {
  switch (type) {
    case 'success':
      return {
        bg: '#0B2B1F',
        border: 'rgba(52, 211, 153, 0.45)',
        chip: 'rgba(52, 211, 153, 0.16)',
        iconColor: '#34D399',
        defaultIcon: 'checkmark-circle' as const,
      };
    case 'error':
      return {
        bg: '#301618',
        border: 'rgba(248, 113, 113, 0.45)',
        chip: 'rgba(248, 113, 113, 0.16)',
        iconColor: '#F87171',
        defaultIcon: 'alert-circle' as const,
      };
    case 'warning':
      return {
        bg: '#2F2410',
        border: 'rgba(251, 191, 36, 0.45)',
        chip: 'rgba(251, 191, 36, 0.16)',
        iconColor: '#FBBF24',
        defaultIcon: 'warning' as const,
      };
    case 'info':
    default:
      return {
        bg: '#1D2433',
        border: 'rgba(255, 90, 54, 0.5)',
        chip: 'rgba(255, 90, 54, 0.16)',
        iconColor: '#FF8A6B',
        defaultIcon: 'information-circle' as const,
      };
  }
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(1)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 100, useNativeDriver: USE_NATIVE_DRIVER, duration: 250 }),
      Animated.timing(opacityAnim, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, duration: 250 }),
    ]).start(() => setToast(null));
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback(
    (message: string, type: ToastType = 'success', icon?: string) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setToast({ message, type, icon });
      AccessibilityInfo.announceForAccessibility(message);
      slideAnim.setValue(100);
      opacityAnim.setValue(0);
      progressAnim.setValue(1);

      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: USE_NATIVE_DRIVER, tension: 50, friction: 8 }),
        Animated.timing(opacityAnim, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, duration: 200 }),
      ]).start();

      // Countdown bar: width only, so it must stay on the JS driver.
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: TOAST_DURATION,
        useNativeDriver: false,
      }).start();

      timeoutRef.current = setTimeout(hideToast, TOAST_DURATION);
    },
    [slideAnim, opacityAnim, progressAnim, hideToast]
  );

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const config = toast ? getConfig(toast.type) : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && config && (
        <Animated.View
          pointerEvents="box-none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            {
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={hideToast}
            accessibilityRole="alert"
            accessibilityLabel={`${toast.type}: ${toast.message}`}
            accessibilityHint="Activates to dismiss this message"
            style={[
              styles.toastCard,
              { backgroundColor: config.bg, borderColor: config.border },
            ]}
          >
            <View style={[styles.iconChip, { backgroundColor: config.chip }]}>
              <Ionicons
                name={(toast.icon || config.defaultIcon) as any}
                size={18}
                color={config.iconColor}
              />
            </View>
            <Text style={styles.toastText} numberOfLines={3}>
              {toast.message}
            </Text>
            <Animated.View
              style={[
                styles.progress,
                {
                  backgroundColor: config.iconColor,
                  width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                },
              ]}
            />
          </TouchableOpacity>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    bottom: 80,
    left: 16,
    right: 16,
    zIndex: 10000,
    elevation: 20,
    boxShadow: '0px 6px 12px rgba(0, 0, 0, 0.35)',
  },
  toastCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
  progress: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    height: 3,
    borderRadius: 2,
    opacity: 0.9,
  },
});
