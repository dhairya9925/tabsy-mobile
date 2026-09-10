import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { SproutButton } from './SproutButton';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  actionLabel?: string;
  onActionPress?: () => void;
  card?: boolean;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  actionLabel,
  onActionPress,
  card = false,
  style,
}) => {
  return (
    <View style={[styles.container, card && [styles.cardContainer, shadows.card], style]}>
      <View style={styles.iconCircle}>
        {icon}
      </View>

      <SproutText variant="subtitle" color={colors.text} weight="700" style={styles.title}>
        {title}
      </SproutText>

      <SproutText variant="caption" color={colors.muted} style={styles.subtitle}>
        {subtitle}
      </SproutText>

      {actionLabel && onActionPress && (
        <View style={styles.actionWrap}>
          <SproutButton
            label={actionLabel}
            onPress={onActionPress}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  cardContainer: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.soft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
    marginBottom: spacing.md,
  },
  actionWrap: {
    marginTop: spacing.xs,
    minWidth: 180,
  },
  actionButton: {
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
  },
});
