import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import { HelpCircle, ChevronRight } from 'lucide-react-native';

interface ClarificationBubbleProps {
  content: string;
  options?: string[];
  onSelectOption: (option: string) => void;
  disabled?: boolean;
}

export const ClarificationBubble: React.FC<ClarificationBubbleProps> = ({
  content,
  options = [],
  onSelectOption,
  disabled = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.iconBadge}>
            <HelpCircle size={15} color={colors.sun} strokeWidth={2.4} />
          </View>
          <SproutText variant="caption" style={styles.eyebrow}>
            CLARIFICATION NEEDED
          </SproutText>
        </View>

        <SproutText variant="body" style={styles.content}>
          {content}
        </SproutText>

        {options && options.length > 0 && (
          <View style={styles.optionsContainer}>
            <SproutText variant="caption" style={styles.optionsHint}>
              Tap an option or type your reply:
            </SproutText>
            <View style={styles.chipsWrapper}>
              {options.map((opt, idx) => (
                <TouchableOpacity
                  key={`opt_${idx}_${opt}`}
                  style={styles.chip}
                  onPress={() => onSelectOption(opt)}
                  disabled={disabled}
                  activeOpacity={0.7}
                >
                  <SproutText variant="body" style={styles.chipText}>
                    {opt}
                  </SproutText>
                  <ChevronRight size={13} color={colors.accent} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    maxWidth: '92%',
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
    marginBottom: spacing.xs,
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
  content: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  optionsContainer: {
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  optionsHint: {
    color: colors.muted,
    marginBottom: spacing.xs,
    fontSize: 11,
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
    paddingVertical: 6,
    paddingHorizontal: 12,
    gap: 4,
  },
  chipText: {
    fontSize: 13,
    color: colors.accent,
    fontFamily: fontFamilies.semiBold,
  },
});
