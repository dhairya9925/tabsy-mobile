import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing } from '../../theme';
import { SproutText } from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { Wallet } from 'lucide-react-native';

export const SplashScreen: React.FC = () => {
  const initializeSession = useAuthStore((s) => s.initializeSession);

  useEffect(() => {
    // Initial bootstrap
    const timer = setTimeout(() => {
      initializeSession();
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Wallet size={46} color={colors.accent} strokeWidth={2.2} />
        </View>
        <SproutText variant="hero" color={colors.text} style={styles.brand}>
          SplitTrack
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.tagline}>
          Split expenses, not friendships
        </SproutText>
      </View>

      <View style={styles.footer}>
        <ActivityIndicator size="small" color={colors.accent} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: spacing.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  brand: {
    marginBottom: spacing.xs,
  },
  tagline: {
    fontSize: 15,
  },
  footer: {
    height: 40,
    justifyContent: 'center',
  },
});
