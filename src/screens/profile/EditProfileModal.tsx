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
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme, colors, radii, spacing } from '../../theme';
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
import { ArrowLeft, X, User, Pencil, Image as ImageIcon, Check, Shield, Trash2 } from 'lucide-react-native';
import { AVATAR_OPTIONS } from '../auth/AvatarSelectionScreen';

export const EditProfileModal: React.FC = () => {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const logout = useAuthStore((s) => s.logout);

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(user?.avatar_url || null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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

  const handleDeleteAccountPress = () => {
    Alert.alert(
      'Delete Account',
      'Are you absolutely sure? This action cannot be undone. This will permanently delete your account and all associated data including expenses, group memberships, and splits.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await authApi.deleteAccount();
              await logout();
            } catch (err: any) {
              setErrorMessage(err.message || 'Failed to delete account');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
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
            const isSelected = selectedAvatar === item.url;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => setSelectedAvatar(item.url)}
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
      </View>

      {/* Save Button */}
      <View style={styles.bottomCta}>
        <SproutButton
          label="Save Changes"
          onPress={handleSave}
          isLoading={isSaving}
          disabled={isDeleting}
        />
      </View>

      {/* Danger Zone */}
      <View style={[styles.dangerCard, { backgroundColor: colors.surface, borderColor: colors.clay }]}>
        <View style={styles.dangerHeader}>
          <Shield size={18} color={colors.negative} />
          <SproutText variant="subtitle" color={colors.negative} weight="700">
            Danger Zone
          </SproutText>
        </View>
        <SproutText variant="caption" color={colors.muted} style={styles.dangerDesc}>
          Once you delete your account, there is no going back. Please be certain. All expenses, balances, and history will be permanently deleted.
        </SproutText>

        <TouchableOpacity
          style={[styles.deleteButton, isDeleting && styles.disabledButton, { backgroundColor: colors.negative }]}
          activeOpacity={0.8}
          disabled={isDeleting || isSaving}
          onPress={handleDeleteAccountPress}
        >
          <Trash2 size={16} color={colors.surface} />
          <SproutText variant="buttonSm" color={colors.surface}>
            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
          </SproutText>
        </TouchableOpacity>
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
  bottomCta: {
    marginTop: spacing.md,
  },
  dangerCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.lg,
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  dangerDesc: {
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 11,
    borderRadius: radii.full,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
