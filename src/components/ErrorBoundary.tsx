import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { SproutButton } from './SproutButton';
import { ShieldAlert } from 'lucide-react-native';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Tabsy ErrorBoundary caught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.container}>
            <View style={[styles.card, shadows.card]}>
              <View style={styles.iconCircle}>
                <ShieldAlert size={32} color={colors.negative} />
              </View>

              <SproutText variant="title" color={colors.text} weight="700" style={styles.title}>
                Something went quiet
              </SproutText>

              <SproutText variant="caption" color={colors.muted} style={styles.desc}>
                An unexpected view error occurred. Your saved expenses and account data remain completely safe.
              </SproutText>

              {__DEV__ && this.state.error && (
                <View style={styles.devErrorBox}>
                  <SproutText variant="monoSm" color={colors.negative} style={styles.devErrorText}>
                    {this.state.error.message}
                  </SproutText>
                </View>
              )}

              <SproutButton
                label="Reload View"
                onPress={this.handleReset}
                style={styles.button}
              />
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.clay,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  title: {
    textAlign: 'center',
    marginBottom: 6,
  },
  desc: {
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  devErrorBox: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.clay,
    width: '100%',
    marginBottom: spacing.md,
  },
  devErrorText: {
    fontSize: 11,
  },
  button: {
    width: '100%',
  },
});
