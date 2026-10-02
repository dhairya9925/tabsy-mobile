import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import { Bot, User, Mic } from 'lucide-react-native';

interface ChatBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  isVoice?: boolean;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  role,
  content,
  timestamp,
  isVoice = false,
}) => {
  const isUser = role === 'user';

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <View style={[styles.container, isUser ? styles.containerUser : styles.containerAssistant]}>
      {/* Assistant Avatar */}
      {!isUser && (
        <View style={styles.assistantAvatar}>
          <Bot size={16} color={colors.accent} strokeWidth={2.2} />
        </View>
      )}

      <View style={[styles.bubbleWrapper, isUser ? styles.wrapperUser : styles.wrapperAssistant]}>
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          {isVoice && isUser && (
            <View style={styles.voiceHeader}>
              <Mic size={14} color={colors.onAccent} />
              <SproutText variant="caption" style={styles.voiceTag}>
                Voice Entry
              </SproutText>
            </View>
          )}

          <SproutText
            variant="body"
            style={[styles.text, isUser ? styles.textUser : styles.textAssistant]}
          >
            {content}
          </SproutText>
        </View>

        {timeStr ? (
          <SproutText variant="caption" style={[styles.time, isUser ? styles.timeUser : styles.timeAssistant]}>
            {timeStr}
          </SproutText>
        ) : null}
      </View>

      {/* User Avatar */}
      {isUser && (
        <View style={styles.userAvatar}>
          <User size={15} color={colors.onAccent} strokeWidth={2.2} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  containerUser: {
    justifyContent: 'flex-end',
  },
  containerAssistant: {
    justifyContent: 'flex-start',
  },
  bubbleWrapper: {
    maxWidth: '82%',
  },
  wrapperUser: {
    alignItems: 'flex-end',
  },
  wrapperAssistant: {
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  bubbleUser: {
    backgroundColor: colors.accent,
    borderBottomRightRadius: radii.xs,
  },
  bubbleAssistant: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderBottomLeftRadius: radii.xs,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
  },
  textUser: {
    color: colors.onAccent,
    fontFamily: fontFamilies.medium,
  },
  textAssistant: {
    color: colors.text,
    fontFamily: fontFamilies.regular,
  },
  voiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
    opacity: 0.9,
  },
  voiceTag: {
    color: colors.onAccent,
    fontSize: 11,
    fontFamily: fontFamilies.semiBold,
  },
  time: {
    fontSize: 10,
    marginTop: 2,
    color: colors.muted,
  },
  timeUser: {
    textAlign: 'right',
    marginRight: 4,
  },
  timeAssistant: {
    textAlign: 'left',
    marginLeft: 4,
  },
  assistantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
});
