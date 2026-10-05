import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';
import { formatDistanceLabel } from '../lib/geoUtils';

/** One place row shown under an assistant answer (features + distance). */
interface ChatPlace {
  key: string;
  name: string;
  category?: string;
  address?: string;
  /** Metres, as returned by the find_nearby_accessible_places RPC. */
  distance?: number;
  /** Human labels of the accessibility features this place has. */
  features: string[];
}

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  actionResponse?: unknown[];
  places?: ChatPlace[];
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

/** Turn a tool result (features jsonb / array + distance) into display data. */
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

  return {
    key: `${raw?.id ?? raw?.name ?? 'place'}-${index}`,
    name: String(raw?.name ?? raw?.place_name ?? 'Accessible place'),
    category: typeof raw?.category === 'string' ? raw.category : undefined,
    address: typeof raw?.address === 'string' ? raw.address : undefined,
    distance,
    features,
  };
};

export interface AccessibilityAgentChatProps {
  onPlaceAdded?: (placeData: any) => void;
  onPlacesFound?: (placesData: any[]) => void;
}

export const AccessibilityAgentChat: React.FC<AccessibilityAgentChatProps> = ({
  onPlaceAdded,
  onPlacesFound,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);

  // Shown only while the chat is empty. Hidden for good after the first question.
  const [showIntro, setShowIntro] = useState(true);
  const { colors } = useAppTheme();

  // GPS position, sent with every message so the assistant can suggest nearby
  // accessible places without having to ask the user for coordinates.
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
        else locationRequest.current = null; // allow a retry on the next message
        return loc;
      });
    }
    return locationRequest.current;
  };

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
    };

    // Previous turns give the assistant context (and the user's language).
    const history = messages.slice(-12).map((m) => ({
      role: m.sender === 'user' ? 'user' : 'assistant',
      content: m.text,
    }));

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setShowIntro(false);

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
        // supabase-js hides the response body ("non-2xx status code"), so read
        // it and turn it into a sentence the user can act on.
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
          // keep the generic message
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

      // Handle return payload format: { text: "...", actionResponse: [...] }
      const botText = data?.text || 'No response received from AI.';
      const actionResponse = data?.actionResponse || [];
      const chatPlaces: ChatPlace[] = [];

      if (Array.isArray(actionResponse) && actionResponse.length > 0) {
        actionResponse.forEach((action: any) => {
          if (action?.tool === 'addAccessiblePlace') {
            onPlaceAdded?.(action.result);
          } else if (action?.tool === 'searchAccessiblePlaces') {
            const places = action.result?.places || action.result;
            const list = Array.isArray(places) ? places : [places];
            list.forEach((place: any, index: number) => {
              chatPlaces.push(toChatPlaces(place, index));
            });
            onPlacesFound?.(list);
          } else if (action?.tool === 'findPlaceInDatabase') {
            // Saved match: show its accessibility details as a card too.
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
        actionResponse,
        places: chatPlaces.length > 0 ? chatPlaces : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          text: `Error: ${message}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const bubbleStyle = (isUser: boolean) => ({
    backgroundColor: isUser ? colors.accent : colors.card,
    borderColor: isUser ? colors.accent : colors.cardBorder,
  });

  const renderItem = ({ item }: { item: Message }) => {
    const isUser = item.sender === 'user';
    return (
      <View>
        <View
          style={[
            styles.bubble,
            bubbleStyle(isUser),
            isUser ? styles.userBubble : styles.botBubble,
          ]}
        >
          <Text style={[styles.messageText, { color: isUser ? '#FFF' : colors.textPrimary }]}>
            {item.text}
          </Text>
        </View>

        {!isUser && item.places && item.places.length > 0 && (
          <View style={styles.placesBlock}>
            {item.places.map((place) => (
              <View
                key={place.key}
                style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={styles.placeHeader}>
                  <Ionicons name="location" size={14} color={colors.accent} />
                  <Text
                    numberOfLines={1}
                    style={[styles.placeName, { color: colors.textPrimary }]}
                  >
                    {place.name}
                  </Text>
                  {typeof place.distance === 'number' && (
                    <View style={[styles.distanceChip, { backgroundColor: colors.accentBg }]}>
                      <Ionicons name="navigate" size={10} color={colors.accent} />
                      <Text style={[styles.distanceText, { color: colors.accent }]}>
                        {formatDistanceLabel(place.distance)}
                      </Text>
                    </View>
                  )}
                </View>

                {!!place.category && (
                  <Text numberOfLines={1} style={[styles.placeMeta, { color: colors.textMuted }]}>
                    {place.category}
                    {place.address ? ` · ${place.address}` : ''}
                  </Text>
                )}

                <View style={styles.featuresRow}>
                  {place.features.length > 0 ? (
                    place.features.map((feature) => (
                      <View
                        key={feature}
                        style={[styles.featureChip, { backgroundColor: colors.chipBg, borderColor: colors.chipBorder }]}
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
                          color={colors.accent}
                        />
                        <Text style={[styles.featureText, { color: colors.textSecondary }]}>
                          {feature}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.placeMeta, { color: colors.textMuted }]}>
                      No accessibility features listed
                    </Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={showIntro ? <IntroBubble colors={colors} /> : null}
      />

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: colors.headerBg, borderColor: colors.headerBorder },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.chipBg,
              borderColor: colors.chipBorder,
              color: colors.textPrimary,
            },
          ]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask accessibility assistant..."
          placeholderTextColor={colors.textMuted}
          editable={!loading}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.accent },
            loading && styles.disabledButton,
          ]}
          onPress={sendMessage}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>Send</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const ABILITIES = [
  'Find accessible places near you, with distance in metres or km',
  'Tell you which accessibility features each place has (ramp, toilet, step-free...)',
  'Check if a place is saved in our database and share its accessibility details',
  'Look up places we do not have yet, with a phone number or website to contact them',
  'Add a new accessible place to the map',
];

const IntroBubble: React.FC<{ colors: Record<string, string> }> = ({ colors }) => (
  <View
    style={[
      styles.bubble,
      styles.botBubble,
      { backgroundColor: colors.card, borderColor: colors.cardBorder },
    ]}
  >
    <Text style={[styles.messageText, { color: colors.textPrimary }]}>
      {'Hi! I am your accessibility helper.\n\nI can do these things for you:'}
    </Text>
    {ABILITIES.map((ability) => (
      <Text
        key={ability}
        style={[styles.messageText, { color: colors.textSecondary }, styles.abilityItem]}
      >
        {`\u2022 ${ability}`}
      </Text>
    ))}
    <Text style={[styles.messageText, { color: colors.textMuted }, styles.introFooter]}>
      Type your question below and I will answer.
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 12,
  },
  bubble: {
    maxWidth: '80%',
    padding: 10,
    borderRadius: 10,
    marginVertical: 4,
    borderWidth: 1,
  },
  userBubble: {
    alignSelf: 'flex-end',
  },
  botBubble: {
    alignSelf: 'flex-start',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  abilityItem: {
    marginTop: 4,
  },
  introFooter: {
    marginTop: 10,
  },
  placesBlock: {
    marginTop: 4,
    marginBottom: 6,
    gap: 6,
  },
  placeCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    maxWidth: '85%',
    alignSelf: 'flex-start',
  },
  placeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  placeName: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  distanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  distanceText: {
    fontSize: 11,
    fontWeight: '700',
  },
  placeMeta: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 3,
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
    borderRadius: 10,
    borderWidth: 1,
  },
  featureText: {
    fontSize: 11,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
});

export default AccessibilityAgentChat;
