import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
import { SproutText, ScreenShell, SegmentControl } from '../../components';
import { Users, UserPlus, FolderPlus } from 'lucide-react-native';

export const SharedScreen: React.FC = () => {
  const [subTab, setSubTab] = useState<'groups' | 'friends'>('groups');

  const options = [
    { value: 'groups' as const, label: 'Groups' },
    { value: 'friends' as const, label: 'Friends' },
  ];

  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent}>
          GROUPS & FRIENDS
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Groups
        </SproutText>
        <SproutText variant="bodyMuted">
          Coordinate expenses with friends and shared groups.
        </SproutText>
      </View>

      <SegmentControl
        options={options}
        value={subTab}
        onChange={(v) => setSubTab(v)}
      />

      <View style={styles.card}>
        {subTab === 'groups' ? (
          <>
            <FolderPlus size={36} color={colors.accent} strokeWidth={1.5} />
            <SproutText variant="subtitle" color={colors.text} style={styles.cardTitle}>
              Group Splitting
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.cardDesc}>
              Create groups for roommates, trips, or dinners. Split bills equally or with custom amounts. Coming in Phase 3.
            </SproutText>
          </>
        ) : (
          <>
            <UserPlus size={36} color={colors.accent} strokeWidth={1.5} />
            <SproutText variant="subtitle" color={colors.text} style={styles.cardTitle}>
              1-on-1 Friends
            </SproutText>
            <SproutText variant="caption" color={colors.muted} style={styles.cardDesc}>
              Track individual balances, simplify debts, and record peer payments. Coming in Phase 4.
            </SproutText>
          </>
        )}
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
  },
});
