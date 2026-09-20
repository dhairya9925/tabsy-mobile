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
import { ArrowLeft, Mail, Lock, User, Eye, EyeOff, ShieldCheck, Phone, ArrowRight } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'Signup'>;

export const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    displayName?: string;
  }>({});
  const [focusedField, setFocusedField] = useState<'name' | 'email' | 'phone' | 'password' | null>(null);

  const handleContinue = () => {
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

    navigation.navigate('AvatarSelect', {
      email: email.trim(),
      password,
      displayName: displayName.trim() || undefined,
      phone: phone.trim() || undefined,
    });
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
            GET STARTED
          </SproutText>
          <SproutText variant="hero" style={styles.title}>
            Create Account
          </SproutText>
          <SproutText variant="bodyMuted" style={styles.subtitle}>
            Start tracking expenses and splitting group tabs easily.
          </SproutText>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          {/* Display Name Field */}
          <View style={styles.fieldGroup}>
            <SproutText variant="caption" color={colors.text} weight="700" style={styles.fieldLabel}>
              FULL NAME
            </SproutText>
            <View
              style={[
                styles.inputRow,
                focusedField === 'name' && styles.inputRowFocused,
                !!fieldErrors.displayName && styles.inputRowError,
              ]}
            >
              <User
                size={18}
                color={focusedField === 'name' ? colors.accent : colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Alex Morgan"
                placeholderTextColor={colors.muted}
                value={displayName}
                onChangeText={(val) => {
                  setDisplayName(val);
                  if (fieldErrors.displayName) {
                    setFieldErrors((e) => ({ ...e, displayName: undefined }));
                  }
                }}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
            {fieldErrors.displayName && (
              <SproutText variant="caption" color={colors.negative} style={styles.errorText}>
                {fieldErrors.displayName}
              </SproutText>
            )}
          </View>

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

          {/* Mobile Number Field (Optional) */}
          <View style={styles.fieldGroup}>
            <SproutText variant="caption" color={colors.text} weight="700" style={styles.fieldLabel}>
              MOBILE NUMBER (OPTIONAL)
            </SproutText>
            <View
              style={[
                styles.inputRow,
                focusedField === 'phone' && styles.inputRowFocused,
              ]}
            >
              <Phone
                size={18}
                color={focusedField === 'phone' ? colors.accent : colors.muted}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="+1 (555) 000-0000"
                placeholderTextColor={colors.muted}
                value={phone}
                onChangeText={setPhone}
                onFocus={() => setFocusedField('phone')}
                onBlur={() => setFocusedField(null)}
                keyboardType="phone-pad"
                autoCorrect={false}
                style={styles.textInput}
              />
            </View>
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
                placeholder="Min. 6 characters"
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

          {/* Security Badge */}
          <View style={styles.securityRow}>
            <ShieldCheck size={14} color={colors.accent} />
            <SproutText variant="caption" color={colors.muted} style={styles.securityText}>
              256-bit secure encryption · Free forever
            </SproutText>
          </View>

          {/* Submit Button */}
          <SproutButton
            label="Continue to Avatar"
            onPress={handleContinue}
            rightIcon={<ArrowRight size={18} color={colors.onAccent} />}
            style={styles.submitButton}
          />
        </View>
      </View>

      {/* Footer Switcher */}
      <View style={styles.footer}>
        <SproutText variant="bodyMuted">Already have an account? </SproutText>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Login')}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
        >
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
    marginBottom: spacing.lg,
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
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: -spacing.xs,
  },
  securityText: {
    marginLeft: spacing.xs + 2,
    fontSize: 11,
  },
  submitButton: {
    marginTop: 2,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl,
  },
});
