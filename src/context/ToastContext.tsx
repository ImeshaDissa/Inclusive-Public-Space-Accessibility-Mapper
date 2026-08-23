import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = useState<ToastData | null>(null);
  const slideAnim = useRef(new Animated.Value(100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 100, useNativeDriver: true, duration: 250 }),
      Animated.timing(opacityAnim, { toValue: 0, useNativeDriver: true, duration: 250 }),
    ]).start(() => setToast(null));
  }, [slideAnim, opacityAnim]);

  const showToast = useCallback((message: string, type: ToastType = 'success', icon?: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setToast({ message, type, icon });
    slideAnim.setValue(100);
    opacityAnim.setValue(0);

    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 50, friction: 8 }),
      Animated.timing(opacityAnim, { toValue: 1, useNativeDriver: true, duration: 200 }),
    ]).start();

    timeoutRef.current = setTimeout(hideToast, 3000);
  }, [slideAnim, opacityAnim, hideToast]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const getConfig = (type: ToastType) => {
    switch (type) {
      case 'success':
        return { bg: '#064E3B', border: '#10B981', iconColor: '#10B981', defaultIcon: 'checkmark-circle' as const };
      case 'error':
        return { bg: '#7F1D1D', border: '#EF4444', iconColor: '#EF4444', defaultIcon: 'alert-circle' as const };
      case 'warning':
        return { bg: '#78350F', border: '#F59E0B', iconColor: '#F59E0B', defaultIcon: 'warning' as const };
      case 'info':
      default:
        return { bg: '#1E1B4B', border: '#6366F1', iconColor: '#818CF8', defaultIcon: 'information-circle' as const };
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: getConfig(toast.type).bg,
              borderColor: getConfig(toast.type).border,
              transform: [{ translateY: slideAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Ionicons
            name={(toast.icon || getConfig(toast.type).defaultIcon) as any}
            size={20}
            color={getConfig(toast.type).iconColor}
          />
          <Text style={styles.toastText} numberOfLines={2}>
            {toast.message}
          </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    zIndex: 10000,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});
