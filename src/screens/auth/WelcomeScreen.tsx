import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import { SproutText, SproutButton, ScreenShell } from '../../components';
import { Sprout } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export const WelcomeScreen: React.FC<Props> = ({ navigation }) => {
  return (
    <ScreenShell scrollable={false} contentContainerStyle={styles.container}>
      <View style={styles.topSection}>
        <View style={styles.iconCircle}>
          <Sprout size={44} color={colors.accent} strokeWidth={2.2} />
        </View>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          EXPENSE RHYTHM
        </SproutText>
        <SproutText variant="hero" style={styles.hero}>
          Keep it clear,{'\n'}day by day.
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.description}>
          A mindful, calm rhythm for your personal expenses and shared splitwise balance.
        </SproutText>
      </View>

      <View style={styles.cardPreview}>
        <View style={styles.previewDot} />
        <SproutText variant="caption" color={colors.text} weight="700">
          Sync with your friends & groups seamlessly.
        </SproutText>
      </View>

      <View style={styles.bottomSection}>
        <SproutButton
          label="Create account"
          onPress={() => navigation.navigate('Signup')}
          style={styles.primaryButton}
        />
        <SproutButton
          label="Log in"
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
  previewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.accent,
    marginRight: spacing.sm,
  },
  bottomSection: {
    gap: spacing.md,
  },
  primaryButton: {
    marginBottom: 4,
  },
});
