import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ViewStyle,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing } from '../theme';
import { useThemeStore } from '../store/useThemeStore';

export interface ScreenShellProps {
  children: React.ReactNode;
  scrollable?: boolean;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
}

export const ScreenShell: React.FC<ScreenShellProps> = ({
  children,
  scrollable = true,
  onRefresh,
  isRefreshing = false,
  style,
  contentContainerStyle,
}) => {
  const isDark = useThemeStore((s) => s.isDark);
  const insets = useSafeAreaInsets();

  const content = scrollable ? (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + spacing.xl, 112) }, contentContainerStyle]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            colors={[colors.accent]}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.staticContent, { paddingBottom: Math.max(insets.bottom, spacing.md) }, contentContainerStyle]}>{children}</View>
  );

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }, style]}
      edges={['top', 'left', 'right']}
    >
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView
        behavior="padding"
        style={styles.keyboardContainer}
      >
        {content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
    paddingBottom: 112,
  },
  staticContent: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 10,
  },
});
