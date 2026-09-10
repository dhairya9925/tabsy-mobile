import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { colors, spacing } from '../../theme';
import {
  SproutText,
  SproutButton,
  FieldRow,
  CircleButton,
  ScreenShell,
  Toast,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    displayName?: string;
  }>({});

  const signup = useAuthStore((s) => s.signup);
  const isLoading = useAuthStore((s) => s.isLoading);

  const handleSignup = async () => {
    setErrorMessage('');
    const errors: { email?: string; password?: string; displayName?: string } = {};

    if (!email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    if (!password) {
      errors.password = 'Password is required';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});

    try {
      await signup({
        email: email.trim(),
        password,
        display_name: displayName.trim() || undefined,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Signup failed. Please try again.');
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

      <View style={styles.topNav}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
      </View>

      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          NEW ACCOUNT
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Start your rhythm.
        </SproutText>
        <SproutText variant="bodyMuted">
          Create your account to sync expenses day by day.
        </SproutText>
      </View>

      <View style={styles.form}>
        <FieldRow
          label="Your Name (Optional)"
          placeholder="e.g. Dhairya Patel"
          value={displayName}
          onChangeText={setDisplayName}
          icon={<User size={18} color={colors.muted} />}
          errorMessage={fieldErrors.displayName}
        />

        <FieldRow
          label="Email Address"
          placeholder="name@example.com"
          value={email}
          onChangeText={(val) => {
            setEmail(val);
            if (fieldErrors.email) setFieldErrors((e) => ({ ...e, email: undefined }));
          }}
          autoCapitalize="none"
          keyboardType="email-address"
          icon={<Mail size={18} color={colors.muted} />}
          errorMessage={fieldErrors.email}
        />

        <FieldRow
          label="Password (min 6 characters)"
          placeholder="••••••••"
          value={password}
          onChangeText={(val) => {
            setPassword(val);
            if (fieldErrors.password) setFieldErrors((e) => ({ ...e, password: undefined }));
          }}
          secureTextEntry={!showPassword}
          icon={<Lock size={18} color={colors.muted} />}
          rightAction={
            <TouchableOpacity onPress={() => setShowPassword((p) => !p)}>
              {showPassword ? (
                <EyeOff size={18} color={colors.muted} />
              ) : (
                <Eye size={18} color={colors.muted} />
              )}
            </TouchableOpacity>
          }
          errorMessage={fieldErrors.password}
        />

        <SproutButton
          label="Create account"
          isLoading={isLoading}
          onPress={handleSignup}
          style={styles.submitButton}
        />
      </View>

      <View style={styles.footer}>
        <SproutText variant="bodyMuted">Already have an account? </SproutText>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <SproutText variant="subtitle" color={colors.accent} weight="700">
            Log in
          </SproutText>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: spacing.xxl,
  },
  topNav: {
    marginBottom: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  eyebrow: {
    marginBottom: spacing.xs,
  },
  title: {
    marginBottom: spacing.xs,
  },
  form: {
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.md,
  },
});
