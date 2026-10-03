import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows, fontFamilies } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  ScreenShell,
  Toast,
  TabsyLogo,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);

  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleLogin = async () => {
    setErrorMessage('');
    const errors: { email?: string; password?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      await login({ email: email.trim(), password });
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />

      {/* Top Navigation */}
      <View style={styles.topNav}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
      </View>

      {/* Main Content Area */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <View style={styles.iconCircle}>
              <TabsyLogo size={42} color={colors.text} />
            </View>
          </View>
          <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
            WELCOME BACK
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            Log In
          </SproutText>
          <SproutText variant="bodyMuted" style={styles.subtitle}>
            Sign in to track personal spending, split group bills, and settle debts.
          </SproutText>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Email Field */}
          <View style={styles.fieldGroup}>
            <SproutText variant="caption" color={colors.text} weight="700" style={styles.fieldLabel}>
              EMAIL ADDRESS
            </SproutText>
            <View
              style={[
                styles.inputRow,
                focusedField === 'email' && styles.inputRowFocused,
                !!fieldErrors.email && styles.inputRowError,
              ]}
            >
              <Mail
                size={18}
                color={focusedField === 'email' ? colors.accent : colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="you@example.com"
                placeholderTextColor={colors.muted}
                value={email}
                onChangeText={(val) => {
                  setEmail(val);
                  if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
                }}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="none"
                keyboardType="email-address"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
            {fieldErrors.email && (
              <SproutText variant="caption" color={colors.negative} style={styles.errorText}>
                {fieldErrors.email}
              </SproutText>
            )}
          </View>

          {/* Password Field */}
          <View style={styles.fieldGroup}>
            <SproutText variant="caption" color={colors.text} weight="700" style={styles.fieldLabel}>
              PASSWORD
            </SproutText>
            <View
              style={[
                styles.inputRow,
                focusedField === 'password' && styles.inputRowFocused,
                !!fieldErrors.password && styles.inputRowError,
              ]}
            >
              <Lock
                size={18}
                color={focusedField === 'password' ? colors.accent : colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="••••••••"
                placeholderTextColor={colors.muted}
                value={password}
                onChangeText={(val) => {
                  setPassword(val);
                  if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
              />
              <TouchableOpacity
                onPress={() => setShowPassword((p) => !p)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.eyeButton}
              >
                {showPassword ? (
                  <EyeOff size={18} color={colors.muted} />
                ) : (
                  <Eye size={18} color={colors.muted} />
                )}
              </TouchableOpacity>
            </View>
            {fieldErrors.password && (
              <SproutText variant="caption" color={colors.negative} style={styles.errorText}>
                {fieldErrors.password}
              </SproutText>
            )}
          </View>

          {/* Submit Button */}
          <SproutButton
            label="Log In"
            isLoading={isLoading}
            onPress={handleLogin}
            style={styles.submitButton}
          />
        </View>
      </View>

      {/* Footer Switcher */}
      <View style={styles.footer}>
        <SproutText variant="bodyMuted">Don't have an account? </SproutText>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Signup')}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
          <SproutText variant="subtitle" color={colors.accent} weight="700">
            Sign up
          </SproutText>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingBottom: spacing.xxl,
  },
  topNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  logoContainer: {
    alignItems: 'flex-start',
    marginBottom: spacing.md,
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
    ...shadows.card,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    ...shadows.card,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputRowFocused: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceElevated,
  },
  inputRowError: {
    borderColor: colors.negative,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: fontFamilies.regular,
    color: colors.text,
    paddingVertical: 12,
  },
  eyeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  errorText: {
    marginTop: 4,
    marginLeft: 2,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
});
