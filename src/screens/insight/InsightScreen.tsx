import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SproutText, ScreenShell } from '../../components';
import { ChartNoAxesCombined, Sparkles } from 'lucide-react-native';

export const InsightScreen: React.FC = () => {
  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent}>
          ANALYTICS & BREAKDOWN
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Insight
        </SproutText>
        <SproutText variant="bodyMuted">
          Understand where your money flows month by month.
        </SproutText>
      </View>

      <View style={styles.card}>
        <ChartNoAxesCombined size={44} color={colors.accent} strokeWidth={1.5} />
        <SproutText variant="subtitle" color={colors.text} style={styles.cardTitle}>
          Category & Spending Trends
        </SproutText>
        <SproutText variant="caption" color={colors.muted} style={styles.cardDesc}>
          Interactive pie charts, monthly comparison, and habit pace analysis. Coming in Phase 5.
        </SproutText>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 90,
  },
  header: {
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  title: {
    marginVertical: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  cardTitle: {
    marginTop: spacing.md,
    marginBottom: 4,
  },
  cardDesc: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 4,
  },
});
