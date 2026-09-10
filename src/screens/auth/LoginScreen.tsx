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
import { ArrowLeft, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

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

      <View style={styles.topNav}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
      </View>

      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          LOG IN
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Welcome Back
        </SproutText>
        <SproutText variant="bodyMuted">
          Log in to your Tabsy account
        </SproutText>
      </View>

      <View style={styles.form}>
        <FieldRow
          label="Email"
          placeholder="you@example.com"
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
          label="Password"
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
          label="Log In"
          isLoading={isLoading}
          onPress={handleLogin}
          style={styles.submitButton}
        />
      </View>

      <View style={styles.footer}>
        <SproutText variant="bodyMuted">Don't have an account? </SproutText>
        <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
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
