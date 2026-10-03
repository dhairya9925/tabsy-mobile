import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import {
  HelpCircle,
  ChevronRight,
  Bot,
  Users,
  User,
  Tag,
  MessageSquare,
  Sparkles,
} from 'lucide-react-native';

interface ClarificationBubbleProps {
  question: string;
  understanding?: string;
  options?: string[];
  onSelectOption: (option: string) => void;
  disabled?: boolean;
}

export const ClarificationBubble: React.FC<ClarificationBubbleProps> = ({
  question,
  understanding,
  options = [],
  onSelectOption,
  disabled = false,
}) => {
  // Helper to choose a contextual icon for option chips
  const renderOptionIcon = (opt: string) => {
    const lower = opt.toLowerCase();
    if (lower.includes('group') || lower.includes('room') || lower.includes('trip') || lower.includes('office')) {
      return <Users size={13} color={colors.accent} />;
    }
    if (lower.includes('personal') || lower.includes('myself') || lower.includes('just me')) {
      return <User size={13} color={colors.accent} />;
    }
    if (lower.includes('food') || lower.includes('transport') || lower.includes('shopping') || lower.includes('bills')) {
      return <Tag size={13} color={colors.accent} />;
    }
    return <Sparkles size={13} color={colors.accent} />;
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Header Tag */}
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <HelpCircle size={15} color={colors.sun} strokeWidth={2.4} />
          </View>
          <SproutText variant="caption" style={styles.eyebrow}>
            CLARIFICATION NEEDED
          </SproutText>
        </View>

        {/* AI Understanding Summary Section */}
        {understanding ? (
          <View style={styles.understandingCard}>
            <View style={styles.understandingHeader}>
              <Bot size={13} color={colors.accent} />
              <SproutText variant="caption" style={styles.understandingTitle}>
                I UNDERSTOOD SO FAR
              </SproutText>
            </View>
            <SproutText variant="body" style={styles.understandingText}>
              {understanding}
            </SproutText>
          </View>
        ) : null}

        {/* Main Question */}
        <SproutText variant="body" style={styles.questionText}>
          {question}
        </SproutText>

        {/* Tappable Option Chips */}
        {options && options.length > 0 && (
          <View style={styles.optionsContainer}>
            <SproutText variant="caption" style={styles.optionsHint}>
              Tap an option to choose:
            </SproutText>
            <View style={styles.chipsWrapper}>
              {options.map((opt, idx) => (
                <TouchableOpacity
                  key={`opt_${idx}_${opt}`}
                  style={styles.chip}
                  onPress={() => onSelectOption(opt)}
                  disabled={disabled}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
                >
                  {renderOptionIcon(opt)}
                  <SproutText variant="body" style={styles.chipText}>
                    {opt}
                  </SproutText>
                  <ChevronRight size={13} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Footer Hint */}
        <View style={styles.footerHintRow}>
          <MessageSquare size={12} color={colors.muted} />
          <SproutText variant="caption" style={styles.footerHintText}>
            Or speak / type your answer below
          </SproutText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxWidth: '94%',
    alignSelf: 'flex-start',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.sun,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs + 2,
  },
  iconBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FDF6E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    fontFamily: fontFamilies.bold,
    color: '#9C7A28',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  understandingCard: {
    backgroundColor: colors.background,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  understandingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 2,
  },
  understandingTitle: {
    fontSize: 9,
    fontFamily: fontFamilies.bold,
    color: colors.accent,
    letterSpacing: 0.5,
  },
  understandingText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.text,
    fontFamily: fontFamilies.medium,
  },
  questionText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: fontFamilies.bold,
    marginBottom: spacing.xs,
  },
  optionsContainer: {
    marginTop: spacing.xs + 2,
    paddingTop: spacing.xs + 2,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  optionsHint: {
    color: colors.muted,
    marginBottom: spacing.xs,
    fontSize: 11,
    fontFamily: fontFamilies.medium,
  },
  chipsWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.accentSoft,
    borderWidth: 1,
    borderRadius: radii.full,
    paddingVertical: 7,
    paddingHorizontal: 12,
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    color: colors.accent,
    fontFamily: fontFamilies.semiBold,
  },
  footerHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
    opacity: 0.8,
  },
  footerHintText: {
    fontSize: 11,
    color: colors.muted,
    fontFamily: fontFamilies.regular,
  },
});
