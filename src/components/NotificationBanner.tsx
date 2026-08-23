import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AppNotification } from '@/types/accessibility';

export const NotificationBanner: React.FC = () => {
  const { notifications, markNotificationsRead, isAuthenticated } = useApp();
  const { colors } = useAppTheme();
  const [visible, setVisible] = useState(false);
  const [currentNotif, setCurrentNotif] = useState<AppNotification | null>(null);
  const slideAnim = useRef(new Animated.Value(-120)).current;
  const hasShownRef = useRef<string[]>([]);

  const showBanner = useCallback((notif: AppNotification) => {
    setCurrentNotif(notif);
    setVisible(true);
    slideAnim.setValue(-120);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();

    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: -120,
        useNativeDriver: true,
        duration: 300,
      }).start(() => {
        setVisible(false);
      });
    }, 4000);
  }, [slideAnim]);

  useEffect(() => {
    if (!isAuthenticated) {
      setVisible(false);
      setCurrentNotif(null);
      hasShownRef.current = [];
      return;
    }

    const unread = notifications.filter((n) => !n.read && !hasShownRef.current.includes(n.id));
    if (unread.length > 0) {
      hasShownRef.current.push(unread[0].id);
      showBanner(unread[0]);
    }
  }, [notifications, showBanner, isAuthenticated]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -120,
      useNativeDriver: true,
      duration: 200,
    }).start(() => {
      setVisible(false);
      markNotificationsRead();
    });
  };

  if (!visible || !currentNotif || !isAuthenticated) return null;

  const isVerified = currentNotif.newStatus === 'verified';
  const isDisputed = currentNotif.newStatus === 'disputed';
  const iconColor = isVerified ? colors.statusDotVerified : isDisputed ? colors.statusDotDisputed : colors.statusDotPending;
  const bgColor = isVerified ? colors.successBg : isDisputed ? colors.errorBg : colors.warningBg;
  const borderColor = isVerified ? colors.success : isDisputed ? colors.error : colors.warning;

  return (
    <Animated.View style={[styles.banner, { backgroundColor: bgColor, borderColor, transform: [{ translateY: slideAnim }] }]}>
      <TouchableOpacity style={styles.bannerContent} onPress={handleDismiss} activeOpacity={0.8}>
        <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
          <Ionicons
            name={isVerified ? 'checkmark-circle' : isDisputed ? 'alert-circle' : 'time'}
            size={22}
            color={iconColor}
          />
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.bannerTitle, { color: colors.textPrimary }]}>
            {isVerified ? 'Place Verified' : isDisputed ? 'Place Disputed' : 'Status Update'}
          </Text>
          <Text style={[styles.bannerMessage, { color: colors.textSecondary }]} numberOfLines={2}>
            {currentNotif.message}
          </Text>
        </View>
        <TouchableOpacity onPress={handleDismiss} style={styles.closeBtn}>
          <Ionicons name="close" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 9999,
    borderBottomWidth: 1,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 14,
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
  },
  bannerMessage: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
  },
});
