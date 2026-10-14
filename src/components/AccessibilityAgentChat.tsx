import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  AccessibilityInfo,
  Keyboard,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { VoiceTypingButton } from '@/components/VoiceTypingButton';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { formatDistanceLabel } from '../lib/geoUtils';
import { openDirections } from '../lib/directions';
import { useToast } from '../context/ToastContext';
import { hapticIcon, hapticInput, hapticSuccess } from '@/lib/haptics';
import { ChatMessageText } from './ChatMessageText';

/** One place row shown under an assistant answer (features + distance). */
export interface ChatPlace {
  key: string;
  name: string;
  category?: string;
  address?: string;
  lat?: number;
  lng?: number;
  distance?: number;
  features: string[];
}

export interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: number;
  actionResponse?: unknown[];
  places?: ChatPlace[];
  receipts?: string[];
}

/** Friendly labels for feature keys coming from the DB / AI tools. */
const FEATURE_LABELS: Record<string, string> = {
  ramp: 'Ramp',
  wheelchairramp: 'Ramp',
  stepfree: 'Step-free',
  stepFree: 'Step-free',
  toilet: 'Accessible toilet',
  restroom: 'Accessible toilet',
  accessibletoilet: 'Accessible toilet',
  elevator: 'Elevator',
  lift: 'Elevator',
  parking: 'Parking',
  accessibleparking: 'Parking',
  tactilepaving: 'Tactile paving',
  automaticdoor: 'Automatic door',
  autodoor: 'Automatic door',
};

const featureLabel = (raw: string): string => {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, '');
  return (
    FEATURE_LABELS[key] ||
    FEATURE_LABELS[raw] ||
    raw.charAt(0).toUpperCase() + raw.slice(1)
  );
};

const toChatPlaces = (raw: any, index: number): ChatPlace => {
  const features = Array.isArray(raw?.features)
    ? (raw.features as unknown[]).map((f) => featureLabel(String(f)))
    : raw?.features && typeof raw.features === 'object'
      ? Object.entries(raw.features as Record<string, unknown>)
          .filter(([, value]) => value === true || value === 'true')
          .map(([key]) => featureLabel(key))
      : [];

  const distance =
    typeof raw?.distance === 'number'
      ? raw.distance
      : typeof raw?.distance_m === 'number'
        ? raw.distance_m
        : undefined;

  const lat = Number(raw?.lat ?? raw?.latitude);
  const lng = Number(raw?.lng ?? raw?.longitude);

  return {
    key: `${raw?.id ?? raw?.name ?? 'place'}-${index}`,
    name: String(raw?.name ?? raw?.place_name ?? 'Accessible place'),
    category: typeof raw?.category === 'string' ? raw.category : undefined,
    address: typeof raw?.address === 'string' ? raw.address : undefined,
    lat: Number.isFinite(lat) ? lat : undefined,
    lng: Number.isFinite(lng) ? lng : undefined,
    distance,
    features,
  };
};

const formatMessageTime = (dateNum?: number): string => {
  const d = dateNum ? new Date(dateNum) : new Date();
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
};

interface ExamplePrompt {
  id: string;
  category: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  query: string;
  tag: string;
  color: string;
}

const EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    id: 'p1',
    category: 'Nearby Search',
    icon: 'location',
    title: 'Accessible Places Near Me',
    query: 'Find wheelchair accessible places near my current location',
    tag: 'GPS Near You',
    color: '#610C27',
  },
  {
    id: 'p2',
    category: 'Mobility & Step-free',
    icon: 'walk',
    title: 'Places With Wheelchair Ramp',
    query: 'Which places near me have a ramp and step-free entrance?',
    tag: 'Ramp Access',
    color: '#8A2846',
  },
  {
    id: 'p3',
    category: 'Restrooms',
    icon: 'water',
    title: 'Accessible Toilet Nearby',
    query: 'Where is the nearest place with an accessible toilet?',
    tag: 'Restrooms',
    color: '#703B52',
  },
  {
    id: 'p4',
    category: 'Vertical Access',
    icon: 'business',
    title: 'Places With Elevator or Lift',
    query: 'Show me venues or stations with an elevator or lift access',
    tag: 'Elevators',
    color: '#7B2D46',
  },
  {
    id: 'p5',
    category: 'Contribution',
    icon: 'add-circle',
    title: 'Add a New Accessible Place',
    query: 'How do I add a new accessible place to the map?',
    tag: 'Contribute',
    color: '#9E4733',
  },
  {
    id: 'p6',
    category: 'Barrier Report',
    icon: 'warning',
    title: 'Report Broken Ramp or Issue',
    query: 'How do I report an accessibility barrier or broken elevator?',
    tag: 'Report Issue',
    color: '#A03038',
  },
];

const QUICK_CHIPS = [
  { label: '📍 Near me', query: 'Accessible places near me' },
  { label: '♿ Ramps', query: 'Places with a wheelchair ramp near me' },
  { label: '🚻 Accessible toilet', query: 'Which places have an accessible toilet?' },
  { label: '🛗 Elevators', query: 'Venues with elevator or lift access near me' },
  { label: '➕ Add place', query: 'I want to add a new place' },
  { label: '📝 File report', query: 'I want to add a report for a barrier' },
  { label: '✅ Verify', query: 'I want to verify places on the map' },
];

/** Hand-over intents to specialized screens */
const ADD_PLACE_INTENT =
  /\b(add|register|pin|put|create|submit|save)\b[^.?!]{0,40}?\b(place|venue|location|spot|shop|store|business|building|mall|hospital|school|temple|park|restaurant|cafe|hotel|pharmacy|bank|office|facility|centre|center)\b/i;
const REPORT_INTENT = /\b(report|issue|problem|barrier|complaint)\b/i;
const wantsToAddPlace = (text: string): boolean =>
  ADD_PLACE_INTENT.test(text) && !REPORT_INTENT.test(text);

const ADD_REPORT_INTENT =
  /\b(add|file|submit|raise|lodge|make|create|start|send|report|write)\b[^.?!]{0,40}?\b(report|issue|problem|complaint|barrier)\b/i;
const wantsToAddReport = (text: string): boolean => ADD_REPORT_INTENT.test(text);

const VERIFY_INTENT = /\b(verify|validate)\b/i;
const wantsToVerify = (text: string): boolean => VERIFY_INTENT.test(text);

/** WhatsApp Pulsing Online Indicator */
const PulsingOnlineDot: React.FC = () => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.45,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.out(Easing.ease),
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
          easing: Easing.in(Easing.ease),
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.onlineContainer}>
      <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulse }] }]} />
      <View style={styles.onlineDot} />
    </View>
  );
};

/** WhatsApp-Style 3 Bouncing Dots Typing Animation */
const WhatsAppTypingIndicator: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animateDot = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: -7,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 260,
            useNativeDriver: true,
            easing: Easing.in(Easing.quad),
          }),
          Animated.delay(350),
        ])
      );
    };

    const a1 = animateDot(dot1, 0);
    const a2 = animateDot(dot2, 140);
    const a3 = animateDot(dot3, 280);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotColor = isDark ? '#E3C1B4' : '#610C27';

  return (
    <View style={styles.typingRow}>
      <View style={[styles.avatarMini, { backgroundColor: isDark ? '#2D1B22' : '#F4EBE8' }]}>
        <Ionicons name="sparkles" size={12} color={isDark ? '#E3C1B4' : '#610C27'} />
      </View>
      <View style={[styles.typingBubble, isDark ? styles.typingBubbleDark : styles.typingBubbleLight]}>
        <View style={styles.typingDotsWrap}>
          <Animated.View style={[styles.typingDot, { backgroundColor: dotColor, transform: [{ translateY: dot1 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: dotColor, transform: [{ translateY: dot2 }] }]} />
          <Animated.View style={[styles.typingDot, { backgroundColor: dotColor, transform: [{ translateY: dot3 }] }]} />
        </View>
        <Text style={[styles.typingLabel, { color: isDark ? '#AC9C8D' : '#70625D' }]}>
          typing…
        </Text>
      </View>
    </View>
  );
};

/** Message Entrance Animation */
const AnimatedBubbleWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
        easing: Easing.out(Easing.ease),
      }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      {children}
    </Animated.View>
  );
};

export interface AccessibilityAgentChatProps {
  onPlaceAdded?: (placeData: any) => void;
  onPlacesFound?: (placesData: any[]) => void;
  onDataChanged?: () => void;
  onAddPlace?: () => void;
  onAddReport?: () => void;
  onVerifyPlace?: () => void;
}

export const AccessibilityAgentChat: React.FC<AccessibilityAgentChatProps> = ({
  onPlaceAdded,
  onPlacesFound,
  onDataChanged,
  onAddPlace,
  onAddReport,
  onVerifyPlace,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);

  const { isDark } = useAppTheme();
  const { showToast } = useToast();
  const listRef = useRef<FlatList<Message>>(null);
  const rootRef = useRef<View>(null);
  // Android KAV height behavior leaves the input half under the keyboard, so
  // measure the real overlap ourselves and pad the chat flow by exactly that.
  // Self-corrects whether or not the window resizes (adjustResize).
  const [kbOverlap, setKbOverlap] = useState(0);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const applyOverlap = (kbTopScreenY: number) => {
      rootRef.current?.measureInWindow((_x, y, _w, h) => {
        if (h > 0) setKbOverlap(Math.max(0, y + h - kbTopScreenY));
      });
    };
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      applyOverlap(e.endCoordinates.screenY)
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbOverlap(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  // Send button press scale animation
  const sendScale = useRef(new Animated.Value(1)).current;

  const handlePlaceDirections = async (place: ChatPlace) => {
    const opened = await openDirections({
      name: place.name,
      address: place.address,
      lat: place.lat,
      lng: place.lng,
    });
    if (!opened) {
      showToast('Could not open a maps app on this device.', 'warning');
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 90);
    return () => clearTimeout(timer);
  }, [messages.length, loading]);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationRequest = useRef<Promise<{ lat: number; lng: number } | null> | null>(null);

  const fetchLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
        const coords = await new Promise<{ latitude: number; longitude: number }>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (pos) =>
                resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
              () => reject(new Error('Location unavailable')),
              { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
            );
          }
        );
        return { lat: coords.latitude, lng: coords.longitude };
      }

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({});
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  };

  const resolveLocation = async (): Promise<{ lat: number; lng: number } | null> => {
    if (userLocation) return userLocation;
    if (!locationRequest.current) {
      locationRequest.current = fetchLocation().then((loc) => {
        if (loc) setUserLocation(loc);
        else locationRequest.current = null;
        return loc;
      });
    }
    return locationRequest.current;
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    Alert.alert(
      'Clear Conversation',
      'Do you want to reset this chat and start fresh?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            showToast('Chat conversation reset.', 'info');
          },
        },
      ]
    );
  };

  const sendMessage = async (override?: string) => {
    const text = (override ?? inputText).trim();
    if (!text || loading) return;

    Animated.sequence([
      Animated.timing(sendScale, { toValue: 0.85, duration: 100, useNativeDriver: true }),
      Animated.timing(sendScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: Date.now(),
    };

    const history = messages.slice(-12).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setShowPromptLibrary(false);

    const handOff = (botText: string, go?: () => void) => {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot' as const,
          text: botText,
          timestamp: Date.now(),
        },
      ]);
      go?.();
    };

    if (onAddPlace && wantsToAddPlace(text)) {
      handOff(
        'Sure — let us put it on the map. I have opened the Add Place form for you: search for the place or drag the pin to its exact spot, then tap “+ Add New” to name it and tick the accessibility features it has. Come back here any time if you get stuck.',
        onAddPlace
      );
      return;
    }

    if (onAddReport && wantsToAddReport(text)) {
      handOff(
        'Opening the report form — pick the place on the map, tap Continue, then describe what you found and add a photo if you can.',
        onAddReport
      );
      return;
    }

    if (onVerifyPlace && wantsToVerify(text)) {
      handOff(
        'Opening the verification queue — confirm or dispute the places waiting for a check.',
        onVerifyPlace
      );
      return;
    }

    setLoading(true);

    try {
      const location = await resolveLocation();

      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: {
          message: text,
          messages: history,
          location: location ?? undefined,
        },
      });

      if (error) {
        let detail = error.message || 'Edge function call failed';
        try {
          const ctx: any = (error as any).context;
          if (ctx && typeof ctx.text === 'function') {
            const raw = String(await ctx.text());
            try {
              const parsed = JSON.parse(raw);
              if (parsed?.error) detail = String(parsed.error);
            } catch {
              if (raw.trim()) detail = raw.slice(0, 300);
            }
          }
        } catch {
          // generic error
        }

        if (/rate limit|429|free-models-per-day/i.test(detail)) {
          detail =
            'My daily AI limit has been reached for today. Please try again a little later (it resets at 5.30 AM in Sri Lanka).';
        } else if (/OPENROUTER_API_KEY/i.test(detail)) {
          detail = 'The AI service is not configured yet. Please try again later.';
        } else if (detail.length > 220) {
          detail = 'I could not answer right now. Please try again in a moment.';
        }

        throw new Error(detail);
      }

      const botText = data?.text || 'No response received from AI.';
      const actionResponse = data?.actionResponse || [];
      const chatPlaces: ChatPlace[] = [];
      const receipts: string[] = [];
      let wroteToMap = false;

      if (Array.isArray(actionResponse) && actionResponse.length > 0) {
        actionResponse.forEach((action: any) => {
          if (action?.tool === 'addAccessiblePlace') {
            const result = action.result ?? {};
            if (result.status === 'created') {
              onPlaceAdded?.(result);
              wroteToMap = true;
              receipts.push(
                `Added “${result.place?.name ?? 'the place'}” to the map — pending verification`
              );
            }
          } else if (action?.tool === 'reportPlaceIssue') {
            const result = action.result ?? {};
            if (result.status === 'created') {
              wroteToMap = true;
              receipts.push(`Filed your report for “${result.report?.place_name ?? 'the place'}”`);
            }
          } else if (action?.tool === 'verifyPlace') {
            const result = action.result ?? {};
            if (result.status === 'recorded') {
              wroteToMap = true;
              const word = result.verdict === 'dispute' ? 'dispute' : 'confirmation';
              receipts.push(
                `Recorded your ${word} for “${result.place_name}” — now ${result.confirm_count} confirms / ${result.dispute_count} disputes (${String(result.place_status ?? '').toUpperCase()})`
              );
            }
          } else if (action?.tool === 'searchAccessiblePlaces') {
            const places = action.result?.places || action.result;
            const list = Array.isArray(places) ? places : [places];
            list.forEach((place: any, index: number) => {
              chatPlaces.push(toChatPlaces(place, index));
            });
            onPlacesFound?.(list);
          } else if (action?.tool === 'findPlaceInDatabase') {
            const places = action.result?.places;
            if (Array.isArray(places)) {
              places.forEach((place: any, index: number) => {
                chatPlaces.push(toChatPlaces(place, index));
              });
            }
          }
        });
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
        timestamp: Date.now(),
        actionResponse,
        places: chatPlaces.length > 0 ? chatPlaces : undefined,
        receipts: receipts.length > 0 ? receipts : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
      // Screen readers wait in silence while the AI "types" — announce the reply.
      AccessibilityInfo.announceForAccessibility(
        botText ? 'Assistant replied' : 'Assistant sent a result'
      );
      if (wroteToMap) onDataChanged?.();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `Error: ${message}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Davis Humphries Design Palette
  const chatBg = isDark ? '#050505' : '#EFECE9';
  const headerBg = isDark ? '#1A1215' : '#610C27';
  const headerText = '#FFFFFF';
  const headerMuted = isDark ? '#DDD9CE' : '#E3C1B4';
  const userBubbleBg = '#610C27';
  const userText = '#FFFFFF';
  const botBubbleBg = isDark ? '#1A1215' : '#FFFFFF';
  const botText = isDark ? '#EFECE9' : '#050505';
  const timeMuted = isDark ? '#AC9C8D' : '#70625D';
  // Input bar directly matches chatBg so bottom area has one unified color
  const inputBarBg = chatBg;
  const inputBg = isDark ? '#1A1215' : '#FFFFFF';
  const inputBorder = isDark ? '#332328' : '#DDD9CE';
  const sendBtnBg = '#610C27';
  const accentColor = isDark ? '#E3C1B4' : '#610C27';

  const renderMessageItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <AnimatedBubbleWrapper>
        <View style={[styles.messageRow, isUser ? styles.rowUser : styles.rowBot]}>
          {!isUser && (
            <View style={[styles.avatarMini, { backgroundColor: isDark ? '#2D1B22' : '#F4EBE8' }]}>
              <Ionicons name="sparkles" size={13} color={accentColor} />
            </View>
          )}

          <View style={styles.bubbleCol}>
            <View
              style={[
                styles.bubbleBase,
                isUser
                  ? [styles.userBubble, { backgroundColor: userBubbleBg }]
                  : [styles.botBubble, { backgroundColor: botBubbleBg }],
                isDark && isUser && styles.userBubbleDarkBorder,
                !isDark && !isUser && styles.botBubbleLightShadow,
              ]}
            >
              <ChatMessageText
                text={item.text}
                style={[styles.messageBody, { color: isUser ? userText : botText }]}
                linkColor={isUser ? '#FFFFFF' : accentColor}
              />

              <View style={styles.timestampContainer}>
                <Text style={[styles.timestampText, { color: isUser ? '#E3C1B4' : timeMuted }]}>
                  {formatMessageTime(item.timestamp)}
                </Text>
                {isUser && (
                  <Ionicons
                    name="checkmark-done"
                    size={15}
                    color="#E3C1B4"
                    style={styles.checkIcon}
                  />
                )}
              </View>
            </View>

            {/* Places rich cards under bot answer */}
            {!isUser && item.places && item.places.length > 0 && (
              <View style={styles.placesContainer}>
                {item.places.map((place) => (
                  <TouchableOpacity
                    key={place.key}
                    style={[
                      styles.placeCard,
                      { backgroundColor: isDark ? '#1A1215' : '#FFFFFF', borderColor: isDark ? '#332328' : '#DDD9CE' },
                    ]}
                    onPress={() => handlePlaceDirections(place)}
                    activeOpacity={0.82}
                    accessibilityRole="button"
                    accessibilityLabel={`Get directions to ${place.name}`}
                  >
                    <View style={styles.placeHeader}>
                      <View style={[styles.placeIconCircle, { backgroundColor: isDark ? 'rgba(227, 193, 180, 0.15)' : 'rgba(97, 12, 39, 0.08)' }]}>
                        <Ionicons name="location" size={14} color={accentColor} />
                      </View>
                      <Text
                        numberOfLines={1}
                        style={[styles.placeName, { color: isDark ? '#EFECE9' : '#050505' }]}
                      >
                        {place.name}
                      </Text>
                      {typeof place.distance === 'number' && (
                        <View style={[styles.distanceBadge, { backgroundColor: isDark ? 'rgba(227, 193, 180, 0.15)' : 'rgba(97, 12, 39, 0.08)' }]}>
                          <Ionicons name="navigate" size={10} color={accentColor} />
                          <Text style={[styles.distanceText, { color: accentColor }]}>
                            {formatDistanceLabel(place.distance)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {!!place.category && (
                      <Text numberOfLines={1} style={[styles.placeMeta, { color: timeMuted }]}>
                        {place.category}
                        {place.address ? ` · ${place.address}` : ''}
                      </Text>
                    )}

                    <View style={styles.featuresRow}>
                      {place.features.length > 0 ? (
                        place.features.map((feature) => (
                          <View
                            key={feature}
                            style={[
                              styles.featureChip,
                              { backgroundColor: isDark ? '#22151A' : '#F7F0ED', borderColor: isDark ? '#38252C' : '#E3C1B4' },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name={
                                /toilet/i.test(feature)
                                  ? 'human-handsdown'
                                  : /step|ramp/i.test(feature)
                                    ? 'walk'
                                    : /elevator|lift/i.test(feature)
                                      ? 'elevator-passenger'
                                      : /parking/i.test(feature)
                                        ? 'car'
                                        : /door/i.test(feature)
                                          ? 'door-sliding'
                                          : 'check-circle'
                              }
                              size={11}
                              color={accentColor}
                            />
                            <Text style={[styles.featureText, { color: accentColor }]}>
                              {feature}
                            </Text>
                          </View>
                        ))
                      ) : (
                        <Text style={[styles.placeMeta, { color: timeMuted }]}>
                          No accessibility features listed
                        </Text>
                      )}
                    </View>

                    <View style={[styles.directionsBar, { borderTopColor: isDark ? '#332328' : '#DDD9CE' }]}>
                      <Ionicons name="navigate-circle-outline" size={14} color={accentColor} />
                      <Text style={[styles.directionsText, { color: accentColor }]}>Get Turn-by-Turn Directions</Text>
                      <Ionicons name="chevron-forward" size={12} color={accentColor} style={{ marginLeft: 'auto' }} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Receipts block */}
            {!isUser && item.receipts && item.receipts.length > 0 && (
              <View style={styles.receiptsContainer}>
                {item.receipts.map((line) => (
                  <View
                    key={line}
                    style={[
                      styles.receiptPill,
                      { backgroundColor: isDark ? '#22151A' : '#F7F0ED', borderColor: isDark ? '#4A202A' : '#E3C1B4' },
                    ]}
                  >
                    <Ionicons name="checkmark-circle" size={15} color={accentColor} />
                    <Text style={[styles.receiptText, { color: isDark ? '#EFECE9' : '#610C27' }]}>
                      {line}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </AnimatedBubbleWrapper>
    );
  };

  return (
    <View ref={rootRef} style={[styles.mainWrapper, { backgroundColor: chatBg }]}>
      {/* WhatsApp Header Bar */}
      <View style={[styles.headerBar, { backgroundColor: headerBg }]}>
        <View style={styles.headerAvatarContainer}>
          <View style={styles.headerAvatar}>
            <Ionicons name="sparkles" size={20} color="#FFFFFF" />
          </View>
          <PulsingOnlineDot />
        </View>

        <View style={styles.headerInfo}>
          <View style={styles.headerTitleRow}>
            <Text style={[styles.headerTitle, { color: headerText }]}>
              Accessibility Assistant
            </Text>
            <Ionicons name="checkmark-circle" size={15} color="#E3C1B4" style={{ marginLeft: 4 }} />
          </View>
          <Text style={[styles.headerStatus, { color: headerMuted }]}>
            {loading ? 'typing…' : 'online • real-time navigator'}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={() => setShowPromptLibrary((prev) => !prev)}
            onPressIn={hapticIcon}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="Toggle example prompts"
          >
            <Ionicons
              name={showPromptLibrary ? 'chatbubbles' : 'bulb-outline'}
              size={20}
              color="#FFFFFF"
            />
          </TouchableOpacity>

          {messages.length > 0 && (
            <TouchableOpacity
              style={styles.headerActionBtn}
              onPress={handleClearChat}
              onPressIn={hapticIcon}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel="Reset conversation"
            >
              <Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Main Chat Flow with Keyboard Avoidance */}
      <KeyboardAvoidingView
        style={[styles.flex, Platform.OS === 'android' && { paddingBottom: kbOverlap }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessageItem}
          contentContainerStyle={[
            styles.listContainer,
            messages.length === 0 && styles.listContainerEmpty,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={<WelcomeNote isDark={isDark} />}
          ListFooterComponent={
            loading ? <WhatsAppTypingIndicator isDark={isDark} /> : null
          }
        />

        {/* Example Prompts Library Sheet (when toggled via bulb) */}
        {showPromptLibrary && (
          <View
            style={[
              styles.drawerSheet,
              { backgroundColor: isDark ? '#1A1215' : '#FFFFFF', borderTopColor: isDark ? '#332328' : '#DDD9CE' },
            ]}
          >
            <View style={styles.drawerHeader}>
              <View style={styles.drawerTitleRow}>
                <Ionicons name="sparkles" size={16} color={accentColor} />
                <Text style={[styles.drawerTitle, { color: isDark ? '#EFECE9' : '#050505' }]}>
                  Example Questions
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowPromptLibrary(false)} onPressIn={hapticIcon}>
                <Ionicons name="close" size={20} color={isDark ? '#AC9C8D' : '#70625D'} />
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.drawerCardsRow}
            >
              {EXAMPLE_PROMPTS.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  style={[
                    styles.drawerCard,
                    { backgroundColor: isDark ? '#050505' : '#FBF9F7', borderColor: isDark ? '#332328' : '#DDD9CE' },
                  ]}
                  onPress={() => sendMessage(p.query)}
                  onPressIn={hapticIcon}
                  activeOpacity={0.8}
                >
                  <View style={[styles.drawerCardIcon, { backgroundColor: p.color + '22' }]}>
                    <Ionicons name={p.icon} size={16} color={p.color} />
                  </View>
                  <Text style={[styles.drawerCardTitle, { color: isDark ? '#EFECE9' : '#050505' }]} numberOfLines={1}>
                    {p.title}
                  </Text>
                  <Text style={[styles.drawerCardQuery, { color: timeMuted }]} numberOfLines={2}>
                    {p.query}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Quick Suggestion Chips Carousel */}
        {!loading && inputText.trim().length === 0 && (
          <View style={styles.chipsRowContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.chipsScroll}
            >
              {QUICK_CHIPS.map((chip, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.chipBtn,
                    {
                      backgroundColor: isDark ? '#1A1215' : '#FFFFFF',
                      borderColor: isDark ? '#332328' : '#DDD9CE',
                    },
                  ]}
                  onPress={() => sendMessage(chip.query)}
                  onPressIn={hapticIcon}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.chipText, { color: isDark ? '#EFECE9' : '#610C27' }]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* WhatsApp-Style Docked Input Bar - Seamlessly matches chatBg */}
        <View style={[styles.inputBarWrap, { backgroundColor: inputBarBg }]}>
          <TouchableOpacity
            style={styles.inputLeftBtn}
            onPress={() => setShowPromptLibrary((prev) => !prev)}
            onPressIn={hapticIcon}
            activeOpacity={0.75}
            accessibilityLabel="Prompt examples"
          >
            <Ionicons
              name={showPromptLibrary ? 'sparkles' : 'bulb-outline'}
              size={22}
              color={showPromptLibrary ? accentColor : (isDark ? '#AC9C8D' : '#70625D')}
            />
          </TouchableOpacity>

          <View
            style={[
              styles.inputBox,
              { backgroundColor: inputBg, borderColor: inputBorder },
            ]}
          >
            <TextInput
              style={[
                styles.textInput,
                { color: isDark ? '#EFECE9' : '#050505' },
              ]}
              value={inputText}
              onChangeText={setInputText}
              onPressIn={hapticInput}
              placeholder="Ask accessibility assistant…"
              placeholderTextColor={isDark ? '#AC9C8D' : '#70625D'}
              editable={!loading}
              multiline
              maxLength={400}
              returnKeyType="send"
              onSubmitEditing={() => sendMessage()}
            />

            {inputText.length > 0 && (
              <TouchableOpacity
                onPress={() => setInputText('')}
                onPressIn={hapticIcon}
                style={styles.clearTextBtn}
                accessibilityLabel="Clear input"
              >
                <Ionicons name="close-circle" size={17} color={isDark ? '#AC9C8D' : '#70625D'} />
              </TouchableOpacity>
            )}

            <VoiceTypingButton
              onResult={(text) => setInputText((prev) => (prev ? `${prev} ${text}` : text))}
              accessibilityLabel="Dictate message — speak to type"
            />
          </View>

          <Animated.View style={{ transform: [{ scale: sendScale }] }}>
            <TouchableOpacity
              style={[
                styles.sendCircle,
                { backgroundColor: sendBtnBg },
                (!inputText.trim() || loading) && styles.sendCircleDisabled,
              ]}
              onPress={() => sendMessage()}
              onPressIn={hapticSuccess}
              disabled={!inputText.trim() || loading}
              activeOpacity={0.85}
              accessibilityRole="button"
              accessibilityLabel="Send message"
            >
              <Ionicons
                name="send"
                size={16}
                color="#FFFFFF"
                style={{ marginLeft: 2 }}
              />
            </TouchableOpacity>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

/** Empty State Hero — short note only; examples live behind the bulb button */
const WelcomeNote: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  const cardBg = isDark ? '#1A1215' : '#FFFFFF';
  const cardBorder = isDark ? '#332328' : '#DDD9CE';
  const titleColor = isDark ? '#EFECE9' : '#050505';
  const descColor = isDark ? '#AC9C8D' : '#70625D';
  const accent = isDark ? '#E3C1B4' : '#610C27';

  return (
    <View style={styles.welcomeContainer}>
      <View style={[styles.heroCard, { backgroundColor: cardBg, borderColor: cardBorder }]}>
        <View style={styles.heroBadgeRow}>
          <View style={[styles.heroSparkleCircle, { backgroundColor: isDark ? 'rgba(227, 193, 180, 0.15)' : 'rgba(97, 12, 39, 0.08)' }]}>
            <Ionicons name="sparkles" size={16} color={accent} />
          </View>
          <Text style={[styles.heroBadgeText, { color: accent }]}>AI ACCESSIBILITY NAVIGATOR</Text>
        </View>
        <Text style={[styles.heroHeading, { color: titleColor }]}>
          Hi there! 👋 How can I help you today?
        </Text>
        <Text style={[styles.heroSubheading, { color: descColor }]}>
          Ask me about wheelchair ramps, accessible restrooms, step-free venues, or add new places to our shared accessibility map. Tap the 💡 icon below for example questions.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  headerAvatarContainer: {
    position: 'relative',
    marginRight: 11,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineContainer: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E3C1B4',
    borderWidth: 1.5,
    borderColor: '#610C27',
  },
  pulseRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(227, 193, 180, 0.45)',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  headerStatus: {
    fontSize: 12,
    marginTop: 1,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionBtn: {
    padding: 6,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  listContainer: {
    paddingHorizontal: 10,
    paddingTop: 12,
    paddingBottom: 8,
  },
  listContainerEmpty: {
    flexGrow: 1,
  },
  messageRow: {
    flexDirection: 'row',
    marginVertical: 4,
    alignItems: 'flex-end',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  rowBot: {
    justifyContent: 'flex-start',
  },
  avatarMini: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
    marginBottom: 4,
  },
  bubbleCol: {
    maxWidth: '82%',
  },
  bubbleBase: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 6,
    borderRadius: 14,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderTopRightRadius: 2,
  },
  userBubbleDarkBorder: {
    borderWidth: 1,
    borderColor: '#4A091E',
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 2,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  botBubbleLightShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    borderColor: '#DDD9CE',
  },
  messageBody: {
    fontSize: 14.5,
    lineHeight: 21,
  },
  timestampContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    marginTop: 3,
    gap: 3,
  },
  timestampText: {
    fontSize: 10.5,
    fontWeight: '500',
  },
  checkIcon: {
    marginLeft: 1,
  },
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 4,
    paddingLeft: 4,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderTopLeftRadius: 2,
    gap: 8,
  },
  typingBubbleLight: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DDD9CE',
  },
  typingBubbleDark: {
    backgroundColor: '#1A1215',
    borderWidth: 1,
    borderColor: '#332328',
  },
  typingDotsWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 14,
  },
  typingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typingLabel: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  placesContainer: {
    marginTop: 6,
    gap: 6,
  },
  placeCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 11,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(97, 12, 39, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  distanceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: 'rgba(97, 12, 39, 0.08)',
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#610C27',
  },
  placeMeta: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
  featuresRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 7,
  },
  featureChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  directionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 7,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.35)',
  },
  directionsText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#610C27',
  },
  receiptsContainer: {
    marginTop: 6,
    gap: 5,
  },
  receiptPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  receiptText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeContainer: {
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  heroCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  heroSparkleCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(97, 12, 39, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBadgeText: {
    fontSize: 10.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    color: '#610C27',
  },
  heroHeading: {
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
    marginBottom: 6,
  },
  heroSubheading: {
    fontSize: 13,
    lineHeight: 18,
  },
  promptsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  promptsSectionTitle: {
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  promptsGrid: {
    gap: 8,
  },
  promptGridCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  promptCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  promptIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptTagPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  promptTagText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  promptCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  promptCardQuery: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 8,
  },
  promptCardAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  promptActionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#610C27',
  },
  drawerSheet: {
    borderTopWidth: 1,
    paddingTop: 10,
    paddingBottom: 8,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  drawerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  drawerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  drawerCardsRow: {
    paddingHorizontal: 10,
    gap: 8,
  },
  drawerCard: {
    width: 170,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  drawerCardIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  drawerCardTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 2,
  },
  drawerCardQuery: {
    fontSize: 11,
    lineHeight: 14,
  },
  chipsRowContainer: {
    paddingVertical: 5,
  },
  chipsScroll: {
    paddingHorizontal: 8,
    gap: 6,
  },
  chipBtn: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 7,
    gap: 6,
  },
  inputLeftBtn: {
    padding: 6,
    borderRadius: 20,
  },
  inputBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 8 : 4,
    minHeight: 40,
    maxHeight: 100,
  },
  textInput: {
    flex: 1,
    fontSize: 14.5,
    paddingTop: 0,
    paddingBottom: 0,
  },
  clearTextBtn: {
    padding: 2,
  },
  sendCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
  sendCircleDisabled: {
    opacity: 0.5,
  },
});

export default AccessibilityAgentChat;
