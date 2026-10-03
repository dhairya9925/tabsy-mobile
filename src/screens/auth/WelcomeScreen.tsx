import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import { SproutText, SproutButton, ScreenShell, TabsyLogo } from '../../components';
import { Zap, RefreshCw, ShieldCheck } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const FEATURES = [
  { icon: Zap, label: 'Smart Splitting' },
  { icon: RefreshCw, label: 'Real-time Sync' },
  { icon: ShieldCheck, label: 'Debt Simplification' },
] as const;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ScreenShell scrollable={false} contentContainerStyle={styles.container}>
      {/* ---- Hero section ---- */}
      <View style={styles.heroSection}>
        <View style={styles.iconCircle}>
          <TabsyLogo size={40} color={colors.text} />
        </View>

        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          SMART EXPENSE TRACKING
        </SproutText>
        <SproutText variant="hero" style={styles.heroText}>
          Split expenses,{'\n'}not friendships.
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.description}>
          Track personal spending, split group bills, and settle debts — all in one simple app.
        </SproutText>

        {/* ---- Feature pills ---- */}
        <View style={styles.featureRow}>
          {FEATURES.map(({ icon: Icon, label }) => (
            <View key={label} style={styles.featurePill}>
              <Icon size={14} color={colors.accent} strokeWidth={2.4} />
              <SproutText variant="caption" color={colors.text} weight="600" style={styles.featureLabel}>
                {label}
              </SproutText>
            </View>
          ))}
        </View>
      </View>

      {/* ---- CTA section ---- */}
      <View style={styles.ctaSection}>
        <SproutButton
          label="Get Started Free"
          onPress={() => navigation.navigate('Signup')}
          style={styles.primaryButton}
        />
        <SproutButton
          label="Log In"
          variant="outline"
          onPress={() => navigation.navigate('Login')}
        />
        <SproutText variant="caption" color={colors.muted} style={styles.termsHint}>
          Free forever · No credit card needed
        </SproutText>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: spacing.xxl,
  },
  heroSection: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  heroText: {
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    ...shadows.card,
  },
  featureLabel: {
    marginLeft: spacing.xs + 2,
  },
  ctaSection: {
    gap: spacing.md,
  },
  primaryButton: {
    marginBottom: 2,
  },
  termsHint: {
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
