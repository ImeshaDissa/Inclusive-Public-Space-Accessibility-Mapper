import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppTheme } from '@/context/ThemeContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BadgeItem {
  text: string;
  emoji: string;
  bg: string;
  border: string;
  color: string;
  style: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
}

interface OnboardingSlide {
  id: string;
  title: string;
  description: string;
  img1: ImageSourcePropType;
  img2: ImageSourcePropType;
  img3: ImageSourcePropType;
  badges: BadgeItem[];
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    title: 'Make your journey absolute effortless',
    description:
      'Find verified ramps, tactile paths, and step-free venues before you head out. Powered by direct community audits.',
    img1: require('@/assets/images/onboarding/wheelchair-user.png'),
    img2: require('@/assets/images/onboarding/auditor.png'),
    img3: require('@/assets/images/onboarding/tactile-guide.png'),
    badges: [
      {
        text: 'Verified Access',
        emoji: '♿',
        bg: '#E6F8EE',
        border: '#BBF7D0',
        color: '#0E8345',
        style: { bottom: 12, left: 10 },
      },
      {
        text: 'Smart Alerts',
        emoji: '⚡',
        bg: '#FEF6E4',
        border: '#FDE047',
        color: '#B45309',
        style: { top: 12, right: 10 },
      },
      {
        text: 'Step-Free Ramp',
        emoji: '📐',
        bg: '#FEF9C3',
        border: '#FDE047',
        color: '#713F12',
        style: { top: 24, left: 12 },
      },
      {
        text: 'Tactile Path',
        emoji: '🧭',
        bg: '#E8F5FE',
        border: '#BAE6FD',
        color: '#0369A1',
        style: { bottom: 20, right: 10 },
      },
    ],
  },
  {
    id: '2',
    title: 'Report barriers & update city access in seconds',
    description:
      'Snap photos of steep slopes, broken elevators, or new ramps to keep the community database accurate and live.',
    img1: require('@/assets/images/onboarding/auditor.png'),
    img2: require('@/assets/images/onboarding/wheelchair-user.png'),
    img3: require('@/assets/images/onboarding/scenic-terrace.png'),
    badges: [
      {
        text: 'Photo Evidence',
        emoji: '📸',
        bg: '#FEF08A',
        border: '#FDE047',
        color: '#713F12',
        style: { bottom: 12, right: 10 },
      },
      {
        text: '1:12 Incline Passed',
        emoji: '📏',
        bg: '#E6F8EE',
        border: '#BBF7D0',
        color: '#0E8345',
        style: { top: 14, left: 10 },
      },
      {
        text: 'Barrier Flagged',
        emoji: '⚠️',
        bg: '#FFF1EE',
        border: '#FECDD3',
        color: '#C2410C',
        style: { bottom: 14, left: 10 },
      },
      {
        text: 'Real-Time Pin',
        emoji: '📍',
        bg: '#E8F5FE',
        border: '#BAE6FD',
        color: '#0369A1',
        style: { top: 16, right: 10 },
      },
    ],
  },
  {
    id: '3',
    title: 'Community verified data you can genuinely trust',
    description:
      'Official blueprints are often outdated. Our vibrant navigator community inspects and rates routes so you step forward with confidence.',
    img1: require('@/assets/images/onboarding/tactile-guide.png'),
    img2: require('@/assets/images/onboarding/scenic-terrace.png'),
    img3: require('@/assets/images/onboarding/wheelchair-user.png'),
    badges: [
      {
        text: 'Community Verified',
        emoji: '🛡️',
        bg: '#E6F8EE',
        border: '#BBF7D0',
        color: '#0E8345',
        style: { top: 16, left: 12 },
      },
      {
        text: '99.4% Accuracy',
        emoji: '⭐',
        bg: '#FEF6E4',
        border: '#FDE047',
        color: '#B45309',
        style: { top: 10, right: 12 },
      },
      {
        text: '3x Peer Checks',
        emoji: '👥',
        bg: '#E8F5FE',
        border: '#BAE6FD',
        color: '#0369A1',
        style: { bottom: 18, right: 12 },
      },
    ],
  },
  {
    id: '4',
    title: 'Save favorites & navigate your city with freedom',
    description:
      'Bookmark accessible spots and receive live alerts when transit elevators go down or access improves.',
    img1: require('@/assets/images/onboarding/scenic-terrace.png'),
    img2: require('@/assets/images/onboarding/auditor.png'),
    img3: require('@/assets/images/onboarding/tactile-guide.png'),
    badges: [
      {
        text: 'Saved Places',
        emoji: '❤️',
        bg: '#FFF1EE',
        border: '#FECDD3',
        color: '#E11D48',
        style: { top: 16, left: 12 },
      },
      {
        text: 'Route Alert Active',
        emoji: '🔔',
        bg: '#FEF6E4',
        border: '#FDE047',
        color: '#B45309',
        style: { top: 28, right: 12 },
      },
      {
        text: 'SDG 10 & 11',
        emoji: '🌍',
        bg: '#E6F8EE',
        border: '#BBF7D0',
        color: '#0D9488',
        style: { bottom: 16, left: 14 },
      },
    ],
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isDark } = useAppTheme();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    router.replace('/login');
  };

  const handleGetStarted = () => {
    router.replace('/login');
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / SCREEN_WIDTH);
        setCurrentIndex(index);
      },
    },
  );

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * SCREEN_WIDTH, index * SCREEN_WIDTH, (index + 1) * SCREEN_WIDTH];

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.3, 1, 0.3],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [30, 0, 30],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slideContainer, { width: SCREEN_WIDTH }]}>
        {/* Top Visual Masonry Section */}
        <View style={styles.collageContainer}>
          <View style={styles.masonryGrid}>
            {/* Left Column (Staggered Downwards) */}
            <View style={[styles.column, styles.leftColumn]}>
              <View style={[styles.cardFrame, { height: '56%' }]}>
                <Image source={item.img1} style={styles.cardImage} resizeMode="cover" />
              </View>
              <View style={[styles.cardFrame, { height: '40%' }]}>
                <Image source={item.img3} style={styles.cardImage} resizeMode="cover" />
              </View>
            </View>

            {/* Right Column (Staggered Upwards) */}
            <View style={[styles.column, styles.rightColumn]}>
              <View style={[styles.cardFrame, { height: '42%' }]}>
                <Image source={item.img2} style={styles.cardImage} resizeMode="cover" />
              </View>
              <View style={[styles.cardFrame, { height: '54%' }]}>
                <Image source={item.img1} style={styles.cardImage} resizeMode="cover" />
              </View>
            </View>
          </View>

          {/* Floating Pill Badges */}
          {item.badges.map((badge, bIdx) => (
            <View
              key={bIdx}
              style={[
                styles.badgePill,
                {
                  backgroundColor: badge.bg,
                  borderColor: badge.border,
                },
                badge.style,
              ]}
            >
              <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.text}</Text>
            </View>
          ))}

          {/* Bottom Gradient Overlay Mask */}
          <LinearGradient
            colors={[
              'rgba(255, 255, 255, 0)',
              isDark ? 'rgba(9, 13, 22, 0.75)' : 'rgba(255, 255, 255, 0.75)',
              isDark ? '#090D16' : '#FFFFFF',
            ]}
            style={styles.gradientFade}
            pointerEvents="none"
          />
        </View>

        {/* Bottom Card Content */}
        <Animated.View
          style={[
            styles.bottomContent,
            {
              backgroundColor: isDark ? '#090D16' : '#FFFFFF',
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.textContainer}>
            <Text style={[styles.headline, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
              {item.title}
            </Text>
            <Text style={[styles.subtitle, { color: isDark ? '#94A3B8' : '#64748B' }]}>
              {item.description}
            </Text>
          </View>
        </Animated.View>
      </View>
    );
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#090D16' : '#FFFFFF' }]}>
      {/* Brand Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top + 8, 16) }]}>
        <View style={styles.brandRow}>
          <LinearGradient
            colors={['#FF5A36', '#F43F5E', '#F59E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <View style={styles.logoInner}>
              <Ionicons name="compass" size={16} color="#FF5A36" />
            </View>
          </LinearGradient>
          <Text style={[styles.brandTitle, { color: isDark ? '#F8FAFC' : '#0F172A' }]}>
            Inclusive<Text style={styles.brandTitleAccent}>Mapper</Text>
          </Text>
        </View>
      </View>

      {/* Main Slides List */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
      />

      {/* Footer Navigation Controls */}
      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom + 12, 20) }]}>
        {/* Pagination Dots */}
        <View style={styles.paginationRow}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <Animated.View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive
                      ? '#FF5A36'
                      : isDark
                      ? '#334155'
                      : '#CBD5E1',
                    width: isActive ? 24 : 8,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Controls */}
        <View style={styles.actionControls}>
          {!isLastSlide ? (
            <>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
                accessibilityLabel="Skip onboarding"
                accessibilityRole="button"
              >
                <Text style={[styles.skipText, { color: isDark ? '#64748B' : '#94A3B8' }]}>
                  Skip
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleNext}
                style={styles.nextTextButton}
                activeOpacity={0.8}
                accessibilityLabel="Next slide"
                accessibilityRole="button"
              >
                <Text style={styles.nextText}>Next</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleSkip}
                style={styles.skipButton}
                activeOpacity={0.7}
                accessibilityLabel="Sign in"
                accessibilityRole="button"
              >
                <Text style={[styles.skipText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleGetStarted}
                style={styles.getStartedPillBtn}
                activeOpacity={0.85}
                accessibilityLabel="Get started"
                accessibilityRole="button"
              >
                <Text style={styles.getStartedPillText}>Get Started</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFFFFF" style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    zIndex: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  brandTitleAccent: {
    color: '#FF5A36',
  },
  slideContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  collageContainer: {
    height: SCREEN_HEIGHT * 0.48,
    paddingHorizontal: 16,
    paddingTop: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  masonryGrid: {
    flex: 1,
    flexDirection: 'row',
    gap: 12,
  },
  column: {
    flex: 1,
    gap: 12,
  },
  leftColumn: {
    paddingTop: 12,
  },
  rightColumn: {
    marginTop: -8,
  },
  cardFrame: {
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    ...Platform.select({
      ios: {
        shadowColor: '#0F172A',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
      },
    }),
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badgePill: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    borderWidth: 1,
    zIndex: 25,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
      },
      android: {
        elevation: 5,
      },
      web: {
        boxShadow: '0 4px 14px 0 rgba(0, 0, 0, 0.08)',
      },
    }),
  },
  badgeEmoji: {
    fontSize: 13,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  gradientFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 90,
    zIndex: 20,
  },
  bottomContent: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 24,
    justifyContent: 'center',
  },
  textContainer: {
    gap: 12,
  },
  headline: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 22,
    letterSpacing: 0.1,
  },
  footer: {
    paddingHorizontal: 28,
    paddingTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  paginationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actionControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  skipText: {
    fontSize: 15,
    fontWeight: '600',
  },
  nextTextButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FF5A36',
  },
  getStartedPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5A36',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 9999,
    ...Platform.select({
      ios: {
        shadowColor: '#FF5A36',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 4px 14px 0 rgba(255, 90, 54, 0.35)',
      },
    }),
  },
  getStartedPillText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
