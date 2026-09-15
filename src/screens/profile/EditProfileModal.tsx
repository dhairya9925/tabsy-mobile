import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing } from '../../theme';
import {
  SproutText,
  SproutButton,
  CircleButton,
  ScreenShell,
  AvatarCircle,
  AvatarPickerSheet,
  Toast,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth';
import { avatarKeyToUrl } from '../../utils/avatarRegistry';
import { ArrowLeft, X, User, Pencil } from 'lucide-react-native';

export const EditProfileModal: React.FC = () => {
  const navigation = useNavigation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar_url || null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSave = async () => {
    setIsSaving(true);
    setErrorMessage('');

    try {
      const updatedProfile = await authApi.updateProfile({
        display_name: displayName.trim() || null,
        avatar_url: avatarKeyToUrl(selectedAvatar),
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

      {/* Avatar Preview Section */}
      <View style={styles.previewSection}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setPickerVisible(true)}
          style={styles.avatarWrap}
          accessibilityLabel="Change avatar"
          accessibilityRole="button"
        >
          <AvatarCircle
            name={previewName}
            avatarUrl={selectedAvatar}
            size={88}
          />
          <View style={styles.editBadge}>
            <Pencil size={14} color={colors.surface} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setPickerVisible(true)}
          style={styles.changeAvatarBtn}
        >
          <SproutText variant="buttonSm" color={colors.accent}>
            {selectedAvatar ? 'Change Avatar' : 'Choose Avatar'}
          </SproutText>
        </TouchableOpacity>

        <SproutText variant="caption" color={colors.muted} style={styles.previewHint}>
          {selectedAvatar
            ? 'Tap to select a different avatar or remove it'
            : 'Select from 15 custom avatars or use your initials'}
        </SproutText>
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
      </View>

      {/* Save Button */}
      <View style={styles.bottomCta}>
        <SproutButton
          label="Save Changes"
          onPress={handleSave}
          isLoading={isSaving}
        />
      </View>

      {/* Avatar Picker Modal */}
      <AvatarPickerSheet
        visible={pickerVisible}
        selected={selectedAvatar}
        onSelect={(key) => {
          setSelectedAvatar(key);
          setPickerVisible(false);
        }}
        onClose={() => setPickerVisible(false)}
      />
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
  avatarWrap: {
    position: 'relative',
    marginBottom: spacing.sm,
  },
  editBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  changeAvatarBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  previewHint: {
    marginTop: 2,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
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
  bottomCta: {
    marginTop: spacing.md,
  },
});
