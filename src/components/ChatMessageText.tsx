import React from 'react';
import {
  Linking,
  Platform,
  Text,
  type StyleProp,
  type TextStyle,
} from 'react-native';
import {
  openBrowserAsync,
  WebBrowserPresentationStyle,
} from 'expo-web-browser';

type Segment =
  | { kind: 'text'; value: string }
  | { kind: 'url'; value: string; label: string }
  | { kind: 'phone'; value: string; label: string }
  | { kind: 'email'; value: string; label: string };

/** The model and the OSM scraper both emit HTML entities inside links. */
const decodeEntities = (input: string): string =>
  input.replace(/&(amp|lt|gt|quot|apos|#39|nbsp);/g, (match, name: string) => {
    switch (name) {
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      case 'quot':
        return '"';
      case 'apos':
      case '#39':
        return "'";
      case 'nbsp':
        return ' ';
      default:
        return match;
    }
  });

/**
 * One pass over the message. URLs win over phone numbers so the digits inside
 * a link are never mistaken for a phone number.
 */
const TOKEN_RE =
  /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}|\+?[\d()[\]\s-]{7,}\d)/g;

const TRAILING_PUNCTUATION = /[.,;:!?)\]}'"…]+$/;

const PHONE_LABEL_RE =
  /(phone|tel|call|contact|mobile|whatsapp|hotline|number)\s*:?\s*(?:[-–—])?\s*$/i;

/** Host plus a little path beats a 400-character tracking URL. */
const urlLabel = (raw: string): string => {
  const noProto = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '');
  const noSlash = noProto.replace(/\/+$/, '');
  const queryAt = noSlash.indexOf('?');
  const withoutQuery = queryAt >= 0 ? noSlash.slice(0, queryAt) : noSlash;
  if (withoutQuery.length <= 42) {
    return queryAt >= 0 ? `${withoutQuery}…` : withoutQuery;
  }
  return withoutQuery.split('/')[0];
};

const isPhoneCandidate = (raw: string, source: string, start: number): boolean => {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  const before = source.slice(Math.max(0, start - 24), start);
  if (PHONE_LABEL_RE.test(before)) return true;
  if (raw.includes('+')) return true;
  // Needs a separator so plain numbers in prose stay as text.
  return /[\s()-]/.test(raw.trim());
};

const parse = (rawText: string): Segment[] => {
  const text = decodeEntities(rawText ?? '');
  const segments: Segment[] = [];
  let last = 0;
  TOKEN_RE.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const token = match[0];
    const start = match.index;

    let kind: Segment['kind'] = 'text';
    if (/^https?:\/\//i.test(token) || /^www\./i.test(token)) {
      kind = 'url';
    } else if (token.includes('@')) {
      kind = 'email';
    } else if (isPhoneCandidate(token, text, start)) {
      kind = 'phone';
    }

    if (kind === 'text') continue;

    const trimmed = kind === 'url' ? token.replace(TRAILING_PUNCTUATION, '') : token;
    const end = start + trimmed.length;
    if (end > last) {
      if (start > last) segments.push({ kind: 'text', value: text.slice(last, start) });
      if (kind === 'url') {
        segments.push({ kind, value: trimmed, label: urlLabel(trimmed) });
      } else if (kind === 'phone') {
        segments.push({ kind, value: trimmed.trim(), label: trimmed.trim() });
      } else {
        segments.push({ kind, value: trimmed, label: trimmed });
      }
      last = end;
      TOKEN_RE.lastIndex = last;
    }
  }

  if (last < text.length) segments.push({ kind: 'text', value: text.slice(last) });
  return segments;
};

const openUrl = async (url: string): Promise<void> => {
  const finalUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  try {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.open(finalUrl, '_blank', 'noopener,noreferrer');
      return;
    }
    await openBrowserAsync(finalUrl, {
      presentationStyle: WebBrowserPresentationStyle.AUTOMATIC,
    });
  } catch {
    Linking.openURL(finalUrl).catch(() => {});
  }
};

const openScheme = async (url: string): Promise<void> => {
  try {
    if (await Linking.canOpenURL(url)) await Linking.openURL(url);
  } catch {
    // No app handles this scheme — nothing else to do.
  }
};

export interface ChatMessageTextProps {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Defaults to the app accent colour. */
  linkColor?: string;
}

/**
 * Chat bubble text where URLs, phone numbers and emails become tappable.
 * Long links are shown shortened but always open the full address.
 */
export const ChatMessageText: React.FC<ChatMessageTextProps> = ({
  text,
  style,
  linkColor = '#FF5A36',
}) => {
  const segments = parse(text);

  return (
    <Text style={style}>
      {segments.map((segment, index) => {
        if (segment.kind === 'text') {
          return <Text key={`t${index}`}>{segment.value}</Text>;
        }

        const linkStyle: StyleProp<TextStyle> = {
          color: linkColor,
          fontWeight: '600',
          textDecorationLine: 'underline',
        };

        const onPress =
          segment.kind === 'url'
            ? () => openUrl(segment.value)
            : segment.kind === 'phone'
              ? () => openScheme(`tel:${segment.value.replace(/[^\d+]/g, '')}`)
              : () => openScheme(`mailto:${segment.value}`);

        const hint =
          segment.kind === 'url'
            ? 'Opens the website'
            : segment.kind === 'phone'
              ? 'Calls this number'
              : 'Sends an email';

        return (
          <Text
            key={`l${index}`}
            style={linkStyle}
            accessibilityRole="link"
            accessibilityLabel={`${segment.label}. ${hint}`}
            onPress={onPress}
          >
            {segment.label}
          </Text>
        );
      })}
    </Text>
  );
};

export default ChatMessageText;
