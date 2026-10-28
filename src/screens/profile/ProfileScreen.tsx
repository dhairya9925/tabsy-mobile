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
import { colors, radii, spacing, shadows, useTheme } from '../../theme';
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
  ChevronRight,
  Layers,
} from 'lucide-react-native';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { colors: themeColors, shadows: themeShadows } = useTheme();

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
      <View style={[styles.heroCard, themeShadows.card, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
        <View style={styles.profileHeader}>
          <AvatarCircle
            name={displayName !== 'No name set' ? displayName : email}
            email={email}
            avatarUrl={user?.avatar_url}
            size={58}
          />
          <View style={styles.profileInfo}>
            <SproutText variant="title" color={themeColors.text} numberOfLines={1}>
              {displayName}
            </SproutText>
            <SproutText variant="bodyMuted" color={themeColors.muted} numberOfLines={1}>
              {email}
            </SproutText>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.editProfileButton, { backgroundColor: themeColors.background, borderColor: themeColors.accent }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('EditProfileModal')}
        >
          <Pencil size={15} color={themeColors.accent} />
          <SproutText variant="buttonSm" color={themeColors.accent}>
            Edit Profile
          </SproutText>
        </TouchableOpacity>
      </View>

      {/* Quick Menu Card */}
      <View style={[styles.menuCard, themeShadows.card, { backgroundColor: themeColors.surface, borderColor: themeColors.line }]}>
        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => {
            navigation.navigate('CategoryManager');
          }}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: themeColors.soft }]}>
              <Tag size={17} color={themeColors.accent} />
            </View>
            <View>
              <SproutText variant="body" color={themeColors.text} weight="600">
                Manage Categories
              </SproutText>
              <SproutText variant="caption" color={themeColors.muted}>
                Create custom spending tags
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={themeColors.muted} />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: themeColors.line }]} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Settings')}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: themeColors.background }]}>
              <Settings size={17} color={themeColors.text} />
            </View>
            <View>
              <SproutText variant="body" color={themeColors.text} weight="600">
                App Preferences
              </SproutText>
              <SproutText variant="caption" color={themeColors.muted}>
                Currency, budget pace & info
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={themeColors.muted} />
        </TouchableOpacity>

        <View style={[styles.menuDivider, { backgroundColor: themeColors.line }]} />

        <TouchableOpacity
          style={styles.menuRow}
          activeOpacity={0.7}
          onPress={handleLogoutPress}
        >
          <View style={styles.menuRowLeft}>
            <View style={[styles.menuIconWrap, { backgroundColor: themeColors.clay }]}>
              <LogOut size={17} color={themeColors.negative} />
            </View>
            <View>
              <SproutText variant="body" color={themeColors.negative} weight="600">
                Log Out
              </SproutText>
              <SproutText variant="caption" color={themeColors.muted}>
                Sign out of your session
              </SproutText>
            </View>
          </View>
          <ChevronRight size={18} color={themeColors.muted} />
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
});
