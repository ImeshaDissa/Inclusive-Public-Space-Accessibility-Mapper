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
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  icon: string;
  iconLib: 'Ionicons' | 'MaterialCommunityIcons';
  title: string;
  description: string;
  color: string;
  bgColor: string;
  iconBg: string;
}

const SLIDES: OnboardingSlide[] = [
  {
    id: '1',
    icon: 'accessibility',
    iconLib: 'Ionicons',
    title: 'Welcome to InclusiveMapper',
    description:
      'A community-powered app that maps wheelchair ramps, elevators, accessible restrooms, and step-free paths so everyone can move freely.',
    color: '#1E40AF',
    bgColor: '#EFF6FF',
    iconBg: '#DBEAFE',
  },
  {
    id: '2',
    icon: 'map-marker-radius',
    iconLib: 'MaterialCommunityIcons',
    title: 'Find Accessible Places',
    description:
      'Search for verified accessible venues near you. See ramp status, elevator availability, and restroom access before you go.',
    color: '#047857',
    bgColor: '#ECFDF5',
    iconBg: '#D1FAE5',
  },
  {
    id: '3',
    icon: 'shield-checkmark',
    iconLib: 'Ionicons',
    title: 'Community Verification',
    description:
      'Submit accessibility reports and help verify community data. Three or more confirmations mark a place as verified.',
    color: '#B45309',
    bgColor: '#FFFBEB',
    iconBg: '#FEF3C7',
  },
  {
    id: '4',
    icon: 'heart',
    iconLib: 'Ionicons',
    title: 'Save and Get Updates',
    description:
      'Bookmark your favorite accessible spots. Get notified when a place is verified, disputed, or updated by the community.',
    color: '#DC2626',
    bgColor: '#FEF2F2',
    iconBg: '#FEE2E2',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    }
  };

  const handleSkip = async () => {
    router.replace('/login');
  };

  const handleGetStarted = async () => {
    router.replace('/login');
  };

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / width);
        setCurrentIndex(index);
      },
    },
  );

  const renderSlide = ({ item, index }: { item: OnboardingSlide; index: number }) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.7, 1, 0.7],
      extrapolate: 'clamp',
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.2, 1, 0.2],
      extrapolate: 'clamp',
    });

    const translateY = scrollX.interpolate({
      inputRange,
      outputRange: [50, 0, 50],
      extrapolate: 'clamp',
    });

    return (
      <View style={[styles.slide, { width, backgroundColor: item.bgColor }]}>
        {/* Icon Circle */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              backgroundColor: item.iconBg,
              borderColor: item.color,
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          {item.iconLib === 'Ionicons' ? (
            <Ionicons name={item.icon as any} size={90} color={item.color} />
          ) : (
            <MaterialCommunityIcons name={item.icon as any} size={90} color={item.color} />
          )}
        </Animated.View>

        {/* Text Content */}
        <Animated.View
          style={[
            styles.textContainer,
            {
              transform: [{ translateY }],
              opacity,
            },
          ]}
        >
          <Text style={[styles.title, { color: '#111827' }]}>{item.title}</Text>

          <View style={[styles.divider, { backgroundColor: item.color }]} />

          <Text style={[styles.description, { color: '#374151' }]}>{item.description}</Text>
        </Animated.View>
      </View>
    );
  };

  const isLastSlide = currentIndex === SLIDES.length - 1;
  const activeColor = SLIDES[currentIndex].color;

  return (
    <View style={styles.container}>
      {/* Top Controls */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12 }]}>
        {!isLastSlide ? (
          <TouchableOpacity
            onPress={handleSkip}
            style={[styles.skipBtn, { borderColor: '#D1D5DB' }]}
            accessibilityLabel="Skip onboarding"
            accessibilityRole="button"
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}
      </View>

      {/* Slides */}
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

      {/* Pagination & Buttons */}
      <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 20 }]}>
        {/* Pagination Dots */}
        <View style={styles.pagination}>
          {SLIDES.map((_, index) => {
            const isActive = index === currentIndex;
            return (
              <View
                key={index}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isActive ? activeColor : '#D1D5DB',
                    width: isActive ? 32 : 10,
                  },
                ]}
              />
            );
          })}
        </View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          {isLastSlide ? (
            <TouchableOpacity
              style={[styles.getStartedBtn, { backgroundColor: activeColor }]}
              onPress={handleGetStarted}
              activeOpacity={0.85}
              accessibilityLabel="Get started"
              accessibilityRole="button"
            >
              <Text style={styles.getStartedText}>Get Started</Text>
              <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextBtn, { backgroundColor: activeColor }]}
              onPress={handleNext}
              activeOpacity={0.85}
              accessibilityLabel="Next slide"
              accessibilityRole="button"
            >
              <Text style={styles.nextText}>Next</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    paddingHorizontal: 24,
    paddingBottom: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 2,
  },
  skipText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#6B7280',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  iconContainer: {
    width: 200,
    height: 200,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    marginBottom: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  textContainer: {
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: -0.3,
  },
  divider: {
    width: 60,
    height: 4,
    borderRadius: 2,
  },
  description: {
    fontSize: 19,
    lineHeight: 30,
    textAlign: 'center',
    paddingHorizontal: 4,
    fontWeight: '500',
  },
  bottomSection: {
    paddingHorizontal: 28,
    gap: 28,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 10,
    borderRadius: 5,
  },
  actions: {
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 16,
    minWidth: 200,
    justifyContent: 'center',
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '800',
  },
  getStartedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 52,
    paddingVertical: 20,
    borderRadius: 16,
    width: '100%',
    justifyContent: 'center',
  },
  getStartedText: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
  },
});
