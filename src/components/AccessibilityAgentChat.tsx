import React, { useState } from 'react';
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
import { supabase } from '../lib/supabase';
import { useAppTheme } from '../context/ThemeContext';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  actionResponse?: unknown[];
}

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

  const sendMessage = async () => {
    const text = inputText.trim();
    if (!text || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);
    setShowIntro(false);

    try {
      const { data, error } = await supabase.functions.invoke('ai-orchestrator', {
        body: { message: text },
      });

      if (error) {
        throw new Error(error.message || 'Edge function call failed');
      }

      // Handle return payload format: { text: "...", actionResponse: [...] }
      const botText = data?.text || 'No response received from AI.';
      const actionResponse = data?.actionResponse || [];

      if (Array.isArray(actionResponse) && actionResponse.length > 0) {
        actionResponse.forEach((action: any) => {
          if (action?.tool === 'addAccessiblePlace') {
            onPlaceAdded?.(action.result);
          } else if (action?.tool === 'searchAccessiblePlaces') {
            const places = action.result?.places || action.result;
            onPlacesFound?.(Array.isArray(places) ? places : [places]);
          }
        });
      }

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: botText,
        actionResponse,
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
  'Find accessible places near you',
  'Add a new accessible place to the map',
  'Check which accessibility features a place has',
  'Answer simple questions about accessibility',
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
