import React, { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { colors, spacing } from '../../theme';
import { SproutText } from '../../components';
import { useAuthStore } from '../../store/useAuthStore';

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
        <View style={styles.logoContainer}>
          <Image
            source={require('../../../assets/splash-icon.png')}
            style={styles.logoImage}
            resizeMode="contain"
            accessibilityLabel="Tabsy Logo"
          />
        </View>
        <SproutText variant="hero" color={colors.text} style={styles.brand}>
          Tabsy
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
  logoContainer: {
    width: 96,
    height: 96,
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    backgroundColor: '#183327',
  },
  logoImage: {
    width: 96,
    height: 96,
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
