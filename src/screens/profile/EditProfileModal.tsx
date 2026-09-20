import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  ScreenShell,
  AvatarCircle,
  Toast,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth';
import { ArrowLeft, X, User, Image as ImageIcon, Check } from 'lucide-react-native';
import { AVATAR_OPTIONS } from '../auth/AvatarSelectionScreen';

export const EditProfileModal: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedProfile = await authApi.updateProfile({
        display_name: displayName.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });

      if (user) {
        setUser({
          ...user,
          display_name: updatedProfile.display_name,
          avatar_url: updatedProfile.avatar_url,
        });
      }

      navigation.goBack();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update profile');
      setIsSaving(false);
    }
  };

  const previewName = displayName.trim() || user?.email || 'User';

  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.topBarCenter}>
          <SproutText variant="eyebrow" color={colors.accent}>
            PROFILE
          </SproutText>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            Edit Profile
          </SproutText>
        </View>
        <CircleButton
          icon={<X size={18} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
      </View>

      {/* Avatar Preview */}
      <View style={styles.previewSection}>
        <AvatarCircle avatarUrl={avatarUrl} name={previewName} size={80} />
        <SproutText variant="caption" color={colors.muted} style={styles.previewHint}>
          {avatarUrl ? 'Custom avatar selected' : 'Initials are generated automatically from your name'}
        </SproutText>
      </View>

      {/* Quick Avatar Presets */}
      <View style={styles.presetContainer}>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.presetTitle}>
          CHOOSE AN AVATAR PRESET
        </SproutText>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetScroll}
        >
          {AVATAR_OPTIONS.map((item) => {
            const isSelected = avatarUrl === item.url;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => setAvatarUrl(item.url)}
                style={[
                  styles.presetItem,
                  isSelected && styles.presetItemSelected,
                ]}
              >
                <Image source={{ uri: item.url }} style={styles.presetImage} />
                {isSelected && (
                  <View style={styles.presetCheck}>
                    <Check size={10} color={colors.surface} strokeWidth={3} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Form Fields */}
      <View style={styles.formCard}>
        <View style={styles.fieldGroup}>
          <SproutText variant="caption" color={colors.muted} style={styles.label}>
            Display Name
          </SproutText>
          <View style={styles.inputRow}>
            <User size={18} color={colors.muted} />
            <TextInput
              style={styles.textInput}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor={colors.muted}
              autoCapitalize="words"
            />
          </View>
        </View>

        <View style={styles.fieldDivider} />

        <View style={styles.fieldGroup}>
          <SproutText variant="caption" color={colors.muted} style={styles.label}>
            Avatar URL (Optional)
          </SproutText>
          <View style={styles.inputRow}>
            <ImageIcon size={18} color={colors.muted} />
            <TextInput
              style={styles.textInput}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://example.com/avatar.png"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="url"
            />
          </View>
        </View>
      </View>

      {/* Save Button */}
      <View style={styles.bottomCta}>
        <SproutButton
          label="Save Changes"
          onPress={handleSave}
          isLoading={isSaving}
        />
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  topBarCenter: {
    alignItems: 'center',
  },
  previewSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  previewHint: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  presetContainer: {
    marginBottom: spacing.lg,
  },
  presetTitle: {
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: spacing.xs + 2,
  },
  presetScroll: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  presetItem: {
    position: 'relative',
    padding: 2,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  presetItemSelected: {
    borderColor: colors.accent,
    transform: [{ scale: 1.05 }],
  },
  presetImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface,
  },
  presetCheck: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  formCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.xl,
  },
  fieldGroup: {
    paddingVertical: spacing.xs,
  },
  label: {
    marginBottom: 6,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Manrope-Medium',
    fontSize: 15,
    color: colors.text,
    paddingVertical: 8,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.sm,
  },
  bottomCta: {
    marginTop: spacing.md,
  },
});
