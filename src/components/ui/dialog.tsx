import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ModalProps,
  ViewStyle,
  TextStyle,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';

export interface DialogProps extends ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  contentStyle?: ViewStyle;
}

export function Dialog({
  visible,
  onClose,
  title,
  description,
  children,
  contentStyle,
  ...props
}: DialogProps) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} {...props}>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }, contentStyle]}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                {title && <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>}
                {description && (
                  <Text style={[styles.description, { color: colors.textSecondary }]}>{description}</Text>
                )}
              </View>

              <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={20} color={colors.textMuted || '#94A3B8'} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.body}>{children}</View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  center: {
    width: '100%',
    maxWidth: 420,
    alignItems: 'center',
  },
  dialogCard: {
    width: '100%',
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  description: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
  },
  closeBtn: {
    padding: 4,
    borderRadius: 12,
  },
  body: {
    gap: 12,
  },
});
