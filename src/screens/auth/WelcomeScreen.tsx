import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import { SproutText, SproutButton, ScreenShell } from '../../components';
import { Wallet, ShieldCheck } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ScreenShell scrollable={false} contentContainerStyle={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Wallet size={40} color={colors.accent} strokeWidth={2.2} />
        </View>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          SMART EXPENSE TRACKING
        </SproutText>
        <SproutText variant="hero" style={styles.hero}>
          Split expenses,{'\n'}not friendships.
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.description}>
          Track personal spending, split group bills, and settle debts — all in one simple app.
        </SproutText>
      </View>

      <View style={styles.cardPreview}>
        <ShieldCheck size={20} color={colors.accent} style={{ marginRight: spacing.sm }} />
        <SproutText variant="caption" color={colors.text} weight="700">
          Automatic debt simplification & instant sync.
        </SproutText>
      </View>

      <View style={styles.bottomSection}>
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
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xl,
  },
  topSection: {
    marginTop: spacing.xl,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
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
  hero: {
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  cardPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    ...shadows.card,
  },
  bottomSection: {
    gap: spacing.md,
  },
  primaryButton: {
    marginBottom: 4,
  },
});
