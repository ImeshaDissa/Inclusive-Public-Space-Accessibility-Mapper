import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Image,
  ImageSourcePropType,
  NativeSyntheticEvent,
  NativeScrollEvent,
  useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OnboardingSlide {
  id: string;
  image: ImageSourcePropType;
  eyebrow: string;
  title: string;
  description: string;
  highlights: string[];
  color: string;
  surfaceColor: string;
  iconBg: string;
  isGuestPromise?: boolean;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: 'welcome',
    image: require('@/assets/images/onboarding/welcome-accessibility.png'),
    eyebrow: 'INCLUSIVE MAPPER',
    title: 'Move through your city with confidence.',
    description: 'Accessibility details, shared by the people who use public spaces every day.',
    highlights: ['Ramps & step-free paths', 'Elevators & accessible restrooms'],
    color: '#2563EB',
    surfaceColor: '#F4F8FF',
    iconBg: '#DCEBFF',
  },
  {
    id: 'discover',
    image: require('@/assets/images/onboarding/discover-accessibility.png'),
    eyebrow: 'PLAN WITH CLARITY',
    title: 'Know what to expect before you go.',
    description: 'Find nearby places and see community-verified access information at a glance.',
    highlights: ['Search nearby venues', 'See verified access details'],
    color: '#047857',
    surfaceColor: '#F2FCF7',
    iconBg: '#D5F5E6',
  },
  {
    id: 'contribute',
    image: require('@/assets/images/onboarding/update-accessibility.png'),
    eyebrow: 'KEEP THE MAP CURRENT',
    title: 'Your local knowledge makes a difference.',
    description: 'Pin an entrance, barrier, or accessibility change as soon as you spot it.',
    highlights: ['Add a new location', 'Update accessibility details'],
    color: '#7C3AED',
    surfaceColor: '#F8F5FF',
    iconBg: '#EDE4FF',
    isGuestPromise: true,
  },
  {
    id: 'community',
    image: require('@/assets/images/onboarding/community-accessibility.png'),
    eyebrow: 'OPTIONAL, ALWAYS',
    title: 'Create an account only when it helps you.',
    description: 'Sign in later to save places and receive updates. The map is ready whenever you are.',
    highlights: ['Save your favorite places', 'Follow community updates'],
    color: '#DB2777',
    surfaceColor: '#FFF5F9',
    iconBg: '#FFE0EC',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList<OnboardingSlide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const goToSlide = (index: number) => {
    const nextIndex = Math.min(Math.max(index, 0), SLIDES.length - 1);
    setCurrentIndex(nextIndex);
    flatListRef.current?.scrollToOffset({ offset: nextIndex * width, animated: true });
  };

  const enterAsGuest = () => {
    router.replace('/map');
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  };

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.84, 1, 0.84],
      extrapolate: 'clamp',
    });
    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.28, 1, 0.28],
      extrapolate: 'clamp',
    });
    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [28, 0, 28],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width, backgroundColor: item.surfaceColor }]}>
        <View style={styles.slideContent}>
          <Animated.View
            style={[
              styles.illustration,
              {
                borderColor: `${item.color}30`,
                opacity,
                transform: [{ scale }],
              },
            ]}
          >
            <Image source={item.image} style={styles.illustrationImage} resizeMode="cover" />
          </Animated.View>

          <Animated.View style={[styles.copy, { opacity, transform: [{ translateY }] }]}>
            <Text style={[styles.eyebrow, { color: item.color }]}>{item.eyebrow}</Text>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>

            {item.isGuestPromise && (
              <View style={[styles.guestPromise, { backgroundColor: '#FFFFFF', borderColor: `${item.color}2E` }]}>
                <View style={[styles.guestPromiseIcon, { backgroundColor: item.iconBg }]}>
                  <Ionicons name="flash" size={16} color={item.color} />
                </View>
                <Text style={styles.guestPromiseText}>
                  Update locations without logging in or signing up.
                </Text>
              </View>
            )}

            <View style={styles.highlights}>
              {item.highlights.map((highlight) => (
                <View key={highlight} style={styles.highlight}>
                  <Ionicons name="checkmark-circle" size={18} color={item.color} />
                  <Text style={styles.highlightText}>{highlight}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>
      </View>
    );
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const activeColor = SLIDES[currentIndex].color;

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        <View style={styles.progressLabel}>
          <Text style={styles.progressText}>{String(currentIndex + 1).padStart(2, '0')}</Text>
          <Text style={styles.progressTotal}> / {String(SLIDES.length).padStart(2, '0')}</Text>
        </View>
        {!isLastSlide && (
          <TouchableOpacity
            onPress={enterAsGuest}
            style={styles.skipBtn}
            accessibilityLabel="Explore the map as a guest"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Explore as guest</Text>
            <Ionicons name="arrow-forward" size={16} color="#475569" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        initialNumToRender={SLIDES.length}
        maxToRenderPerBatch={SLIDES.length}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
      />

      <View style={[styles.bottomSection, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
        <View style={styles.pagination} accessibilityLabel={`Onboarding step ${currentIndex + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={slide.id}
                style={[
                  styles.dot,
                  { backgroundColor: isActive ? activeColor : '#CBD5E1', width: isActive ? 28 : 8 },
                ]}
              />
            );
          })}
        </View>

        {isLastSlide ? (
          <View style={styles.finalActions}>
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: activeColor }]}
              onPress={enterAsGuest}
              activeOpacity={0.86}
              accessibilityLabel="Explore the map without an account"
              accessibilityRole="button"
            >
              <Text style={styles.primaryButtonText}>Explore without an account</Text>
              <Ionicons name="map-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/login')}
              activeOpacity={0.75}
              accessibilityLabel="Sign in or create an account"
              accessibilityRole="button"
            >
              <Text style={styles.secondaryButtonText}>Sign in or create an account</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: activeColor }]}
            onPress={() => goToSlide(currentIndex + 1)}
            activeOpacity={0.86}
            accessibilityLabel="Continue to next onboarding step"
            accessibilityRole="button"
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { flexDirection: 'row', alignItems: 'baseline' },
  progressText: { color: '#0F172A', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  progressTotal: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
  skipBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 10, paddingLeft: 12 },
  skipText: { color: '#475569', fontSize: 14, fontWeight: '700' },
  slide: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  slideContent: { width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', paddingTop: 52 },
  illustration: {
    width: 224,
    height: 224,
    borderRadius: 34,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 34,
    backgroundColor: '#FFFFFF',
  },
  illustrationImage: { width: '100%', height: '100%' },
  copy: { width: '100%', alignItems: 'center' },
  eyebrow: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, textAlign: 'center', marginBottom: 10 },
  title: { color: '#0F172A', fontSize: 30, fontWeight: '900', lineHeight: 37, letterSpacing: -0.7, textAlign: 'center', maxWidth: 460 },
  description: { color: '#475569', fontSize: 16, fontWeight: '500', lineHeight: 24, textAlign: 'center', marginTop: 14, maxWidth: 430 },
  guestPromise: { marginTop: 18, width: '100%', maxWidth: 410, padding: 13, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, elevation: 1, shadowColor: '#334155', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4 },
  guestPromiseIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  guestPromiseText: { flex: 1, color: '#1E293B', fontSize: 14, fontWeight: '800', lineHeight: 19 },
  highlights: { width: '100%', maxWidth: 410, marginTop: 22, gap: 10 },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  highlightText: { color: '#334155', fontSize: 14, fontWeight: '700' },
  bottomSection: { paddingHorizontal: 24, paddingTop: 14, gap: 18, backgroundColor: '#FFFFFF' },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, height: 10 },
  dot: { height: 8, borderRadius: 4 },
  primaryButton: { width: '100%', minHeight: 56, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 20, elevation: 4, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.18, shadowRadius: 8 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  finalActions: { gap: 8 },
  secondaryButton: { minHeight: 42, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#475569', fontSize: 14, fontWeight: '800' },
});
