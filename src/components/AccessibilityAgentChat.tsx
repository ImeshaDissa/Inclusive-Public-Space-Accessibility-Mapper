import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
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
import { openDirections } from '../lib/directions';
import { useToast } from '../context/ToastContext';
import { ChatMessageText } from './ChatMessageText';

/** One place row shown under an assistant answer (features + distance). */
interface ChatPlace {
  key: string;
  name: string;
  category?: string;
  address?: string;
  /** Coordinates, so a result card can offer real turn-by-turn directions. */
  lat?: number;
  lng?: number;
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
  /** Green "what I just did for you" lines for the agentic write tools. */
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

/** One-tap questions shown above the input so nobody has to think of wording. */
const SUGGESTIONS = [
  'Accessible places near me',
  'Places with a ramp near me',
  'Is this place wheelchair accessible?',
  'How do I add a place?',
  'Which places have an accessible toilet?',
];

/**
 * "I want to add a place", "add my shop", "register a new venue" — the
 * customer wants to put something on the map themselves, so the chat hands
 * them over to the Add Place form instead of interviewing them.
 */
const ADD_PLACE_INTENT =
  /\b(add|register|pin|put|create|submit|save)\b[^.?!]{0,40}?\b(place|venue|location|spot|shop|store|business|building|mall|hospital|school|temple|park|restaurant|cafe|hotel|pharmacy|bank|office|facility|centre|center)\b/i;

/** "add a report/issue for this place" is the REPORT flow, not the add-place form. */
const REPORT_INTENT = /\b(report|issue|problem|barrier|complaint)\b/i;

const wantsToAddPlace = (text: string): boolean =>
  ADD_PLACE_INTENT.test(text) && !REPORT_INTENT.test(text);

/** "I want to add report", "file an issue", "report a problem" → Submit wizard. */
const ADD_REPORT_INTENT =
  /\b(add|file|submit|raise|lodge|make|create|start|send|report|write)\b[^.?!]{0,40}?\b(report|issue|problem|complaint|barrier)\b/i;

const wantsToAddReport = (text: string): boolean => ADD_REPORT_INTENT.test(text);

/** "verify this place", "validate entry" → the Verify queue tab. */
const VERIFY_INTENT = /\b(verify|validate)\b/i;

const wantsToVerify = (text: string): boolean => VERIFY_INTENT.test(text);

export interface AccessibilityAgentChatProps {
  onPlaceAdded?: (placeData: any) => void;
  onPlacesFound?: (placesData: any[]) => void;
  /** Called after the assistant writes to the map, so shared state refetches. */
  onDataChanged?: () => void;
  /** Auto-navigates to the Submit wizard when the customer mentions add place / add report. */
  onAddPlace?: () => void;
  onAddReport?: () => void;
  /** Auto-navigates to the Verify queue when the customer mentions verifying a place. */
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

  // Shown only while the chat is empty. Hidden for good after the first question.
  const [showIntro, setShowIntro] = useState(true);
  const { colors } = useAppTheme();
  const { showToast } = useToast();

  /** A suggested place is only useful if the user can actually get to it. */
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

  const listRef = useRef<FlatList<Message>>(null);

  // Keep the newest bubble in view when a reply (or the typing bubble) lands.
  useEffect(() => {
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 80);
    return () => clearTimeout(timer);
  }, [messages.length, loading]);

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

  /** Sends the typed text, or `override` when a suggestion chip was tapped. */
  const sendMessage = async (override?: string) => {
    const text = (override ?? inputText).trim();
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
    setShowIntro(false);

    // One-line bot bubble + jump to the right screen: these phrases are a
    // hand-over, not a conversation, so the AI round-trip is skipped.
    const handOff = (botText: string, go?: () => void) => {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), sender: 'bot' as const, text: botText },
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

      // "What I just did for you" lines for the agentic write tools.
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
        receipts: receipts.length > 0 ? receipts : undefined,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Pull the real rows back in so the Map / Inbox / Profile tabs show the
      // change straight away instead of only after a restart.
      if (wroteToMap) onDataChanged?.();
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
          <ChatMessageText
            text={item.text}
            style={[styles.messageText, { color: isUser ? '#FFF' : colors.textPrimary }]}
            linkColor={isUser ? '#FFF' : colors.accent}
          />
        </View>

        {!isUser && item.places && item.places.length > 0 && (
          <View style={styles.placesBlock}>
            {item.places.map((place) => (
              <TouchableOpacity
                key={place.key}
                style={[styles.placeCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onPress={() => handlePlaceDirections(place)}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Get directions to ${place.name}`}
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

                {/* Discoverability: tapping the card opens the maps app. */}
                <View style={styles.placeCardCta}>
                  <Ionicons name="navigate-outline" size={13} color={colors.accent} />
                  <Text style={[styles.placeCardCtaText, { color: colors.accent }]}>
                    Get directions
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Confirmation of an agentic write (place added / report filed / verified). */}
        {!isUser && item.receipts && item.receipts.length > 0 && (
          <View style={styles.receiptsBlock}>
            {item.receipts.map((line) => (
              <View
                key={line}
                style={[
                  styles.receipt,
                  { backgroundColor: colors.card, borderColor: colors.cardBorder },
                ]}
              >
                <Ionicons name="checkmark-circle" size={14} color="#10B981" />
                <Text style={[styles.receiptText, { color: colors.textPrimary }]}>{line}</Text>
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
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListEmptyComponent={showIntro ? <IntroBubble colors={colors} /> : null}
        ListFooterComponent={
          loading ? (
            <View
              style={[
                styles.bubble,
                styles.botBubble,
                bubbleStyle(false),
                styles.typingBubble,
              ]}
            >
              <ActivityIndicator size="small" color={colors.accent} />
              <Text style={[styles.typingText, { color: colors.textMuted }]}>
                Assistant is typing…
              </Text>
            </View>
          ) : null
        }
      />

      {/* Hand-over happens from typed words (add place / add report / verify);
          no shortcut button here anymore. */}
      {!loading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.suggestionsRow}
        >
          {SUGGESTIONS.map((suggestion) => (
            <TouchableOpacity
              key={suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Ask: ${suggestion}`}
              style={[
                styles.suggestionChip,
                { backgroundColor: colors.accentBg, borderColor: colors.accent },
              ]}
              onPress={() => sendMessage(suggestion)}
            >
              <Ionicons name="sparkles-outline" size={12} color={colors.accent} />
              <Text style={[styles.suggestionText, { color: colors.accent }]}>
                {suggestion}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
          returnKeyType="send"
          accessibilityLabel="Message the accessibility assistant"
          onSubmitEditing={() => sendMessage()}
        />
        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: colors.accent },
            loading && styles.disabledButton,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          onPress={() => sendMessage()}
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
      {'Tap a suggestion below, or type your question. Any website, phone number or email I share can be tapped to open it.'}
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
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  typingText: {
    fontSize: 13,
  },
  suggestionsRow: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 2,
    gap: 6,
  },
  suggestionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 16,
    borderWidth: 1,
  },
  suggestionText: {
    fontSize: 12,
    fontWeight: '600',
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
  receiptsBlock: {
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
    maxWidth: '88%',
    alignSelf: 'flex-start',
  },
  receipt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  receiptText: {
    flexShrink: 1,
    fontSize: 12.5,
    fontWeight: '600',
  },
  placeCardCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.35)',
  },
  placeCardCtaText: {
    fontSize: 12,
    fontWeight: '700',
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
