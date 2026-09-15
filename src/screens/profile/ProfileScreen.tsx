import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  ScreenShell,
  CircleButton,
  AvatarCircle,
  Toast,
} from '../../components';
import { useAuthStore } from '../../store/useAuthStore';
import { authApi } from '../../api/auth';
import {
  ArrowLeft,
  Settings,
  Pencil,
  Tag,
  LogOut,
  Trash2,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const displayName = user?.display_name || 'No name set';
  const email = user?.email || 'Unknown';

  const handleLogoutPress = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of Tabsy?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await authApi.logout();
            } finally {
              await logout();
            }
          },
        },
      ]
    );
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

  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <Toast
        visible={!!errorMessage}
        message={errorMessage}
        type="error"
        onDismiss={() => setErrorMessage('')}
      />
      <Toast
        visible={!!successMessage}
        message={successMessage}
        type="success"
        onDismiss={() => setSuccessMessage('')}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.topBarCenter}>
          <SproutText variant="eyebrow" color={colors.accent}>
            ACCOUNT
          </SproutText>
          <SproutText variant="title" color={colors.text}>
            Profile
          </SproutText>
        </View>
        <CircleButton
          icon={<Settings size={18} color={colors.text} />}
          onPress={() => navigation.navigate('Settings')}
        />
      </View>

      {/* Hero Profile Card */}
      <View style={[styles.heroCard, shadows.card]}>
        <View style={styles.profileHeader}>
          <AvatarCircle
            name={displayName !== 'No name set' ? displayName : email}
            avatarUrl={user?.avatar_url}
            size={58}
          />
          <View style={styles.profileInfo}>
            <SproutText variant="title" color={colors.text} numberOfLines={1}>
              {displayName}
            </SproutText>
            <SproutText variant="bodyMuted" numberOfLines={1}>
              {email}
            </SproutText>
          </View>
        </View>

        <TouchableOpacity
          style={styles.editProfileButton}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EditProfileModal')}
        >
          <Pencil size={15} color={colors.accent} />
          <SproutText variant="buttonSm" color={colors.accent}>
            Edit Profile
          </SproutText>
        </TouchableOpacity>
      </View>

      {/* Quick Menu Card */}
      <View style={[styles.menuCard, shadows.card]}>
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => {
            navigation.navigate('CategoryManager');
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: colors.soft }]}>
              <Tag size={17} color={colors.accent} />
            </View>
            <View>
              <SproutText variant="body" color={colors.text} weight="600">
                Manage Categories
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                Create custom spending tags
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: colors.background }]}>
              <Settings size={17} color={colors.text} />
            </View>
            <View>
              <SproutText variant="body" color={colors.text} weight="600">
                App Preferences
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                Currency, budget pace & info
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </TouchableOpacity>

        <View style={styles.menuDivider} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={handleLogoutPress}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: colors.clay }]}>
              <LogOut size={17} color={colors.negative} />
            </View>
            <View>
              <SproutText variant="body" color={colors.negative} weight="600">
                Log Out
              </SproutText>
              <SproutText variant="caption" color={colors.muted}>
                Sign out of your session
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {/* Danger Zone Card */}
      <View style={[styles.dangerCard, shadows.card]}>
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
          style={[styles.deleteButton, isDeleting && styles.disabledButton]}
          activeOpacity={0.8}
          disabled={isDeleting}
          onPress={handleDeleteAccountPress}
        >
          <Trash2 size={16} color={colors.surface} />
          <SproutText variant="buttonSm" color={colors.surface}>
            {isDeleting ? 'Deleting Account...' : 'Delete Account'}
          </SproutText>
        </TouchableOpacity>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
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
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderTopRightRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.xl,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 10,
    borderRadius: radii.full,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.line,
  },
  dangerCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.clay,
    padding: spacing.lg,
    marginBottom: spacing.xl,
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
    backgroundColor: colors.negative,
    paddingVertical: 11,
    borderRadius: radii.full,
  },
  disabledButton: {
    opacity: 0.6,
  },
});
