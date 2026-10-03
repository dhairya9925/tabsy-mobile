import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
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
import { ArrowLeft, Check, Sparkles } from 'lucide-react-native';

type Props = NativeStackScreenProps<AuthStackParamList, 'AvatarSelect'>;

export interface AvatarOption {
  id: string;
  name: string;
  emoji: string;
  url: string;
  accentBg: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: 'sprout',
    name: 'Sprout',
    emoji: '🌱',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Sprout&backgroundColor=d8e8cb',
    accentBg: '#D8E8CB',
  },
  {
    id: 'zen',
    name: 'Zen Pebble',
    emoji: '🪨',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Zen&backgroundColor=407a58',
    accentBg: '#407A58',
  },
  {
    id: 'sun',
    name: 'Sunbeam',
    emoji: '☀️',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Sun&backgroundColor=f0bf67',
    accentBg: '#F0BF67',
  },
  {
    id: 'fern',
    name: 'Fern Leaf',
    emoji: '🌿',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Fern&backgroundColor=cbd7cc',
    accentBg: '#CBD7CC',
  },
  {
    id: 'flora',
    name: 'Terracotta',
    emoji: '🪴',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Flora&backgroundColor=f4dacd',
    accentBg: '#F4DACD',
  },
  {
    id: 'wave',
    name: 'Slate Wave',
    emoji: '🌊',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Wave&backgroundColor=78919d',
    accentBg: '#78919D',
  },
  {
    id: 'moss',
    name: 'Moss',
    emoji: '🍀',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Moss&backgroundColor=3f7254',
    accentBg: '#3F7254',
  },
  {
    id: 'cedar',
    name: 'Cedar Tree',
    emoji: '🌲',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Cedar&backgroundColor=183228',
    accentBg: '#183228',
  },
  {
    id: 'lotus',
    name: 'River Lotus',
    emoji: '🪷',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=River&backgroundColor=718aa0',
    accentBg: '#718AA0',
  },
  {
    id: 'amber',
    name: 'Gold Amber',
    emoji: '✨',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Amber&backgroundColor=c89d57',
    accentBg: '#C89D57',
  },
  {
    id: 'bloom',
    name: 'Blossom',
    emoji: '🌸',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Bloom&backgroundColor=b97c83',
    accentBg: '#B97C83',
  },
  {
    id: 'dusk',
    name: 'Night Dusk',
    emoji: '🌙',
    url: 'https://api.dicebear.com/7.x/thumbs/png?seed=Dusk&backgroundColor=897a98',
    accentBg: '#897A98',
  },
];

export const AvatarSelectionScreen: React.FC<Props> = ({ route, navigation }) => {
  const { email, password, displayName, phone } = route.params;

  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption>(AVATAR_OPTIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const signup = useAuthStore((s) => s.signup);

  const handleFinish = async (useDefaultAvatar = false) => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      // 1. Create account
      await signup({
        email,
        password,
        display_name: displayName || undefined,
      });

      // 2. If chosen avatar, update avatar_url
      if (!useDefaultAvatar && selectedAvatar) {
        try {
          const updated = await authApi.updateProfile({
            display_name: displayName || null,
            avatar_url: selectedAvatar.url,
          });
          const currentUser = useAuthStore.getState().user;
          if (currentUser) {
            useAuthStore.getState().setUser({
              ...currentUser,
              avatar_url: updated.avatar_url,
            });
          }
        } catch (profileErr) {
          console.log('Avatar profile update note:', profileErr);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete registration');
      setIsSubmitting(false);
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
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleFinish(true)}
          disabled={isSubmitting}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.skipButton}
        >
          <SproutText variant="caption" color={colors.muted} weight="700">
            SKIP
          </SproutText>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <SproutText variant="eyebrow" color={colors.accent} style={styles.eyebrow}>
          STEP 2 OF 2 · PERSONA
        </SproutText>
        <SproutText variant="hero" style={styles.title}>
          Choose your{'\n'}avatar
        </SproutText>
        <SproutText variant="bodyMuted" style={styles.subtitle}>
          Pick an avatar that represents you in group tabs and bill splits.
        </SproutText>
      </View>

      {/* Live Preview Hero Card */}
      <View style={styles.previewCard}>
        <View style={styles.previewAvatarWrapper}>
          <AvatarCircle
            avatarUrl={selectedAvatar.url}
            name={displayName || 'You'}
            size={84}
          />
          <View style={styles.sparkleBadge}>
            <Sparkles size={14} color={colors.surface} />
          </View>
        </View>
        <View style={styles.previewInfo}>
          <SproutText variant="title" color={colors.text} weight="700">
            {displayName || 'You'}
          </SproutText>
          <SproutText variant="caption" color={colors.accent} weight="600" style={styles.previewBadge}>
            {selectedAvatar.emoji} {selectedAvatar.name}
          </SproutText>
          {phone ? (
            <SproutText variant="caption" color={colors.muted} style={styles.phoneHint}>
              📱 {phone}
            </SproutText>
          ) : null}
        </View>
      </View>

      {/* Grid of Avatars */}
      <View style={styles.gridSection}>
        <SproutText variant="caption" color={colors.muted} weight="700" style={styles.sectionLabel}>
          AVAILABLE AVATARS
        </SproutText>
        <View style={styles.grid}>
          {AVATAR_OPTIONS.map((item) => {
            const isSelected = selectedAvatar.id === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                onPress={() => setSelectedAvatar(item)}
                style={[
                  styles.avatarTile,
                  isSelected && styles.avatarTileSelected,
                ]}
              >
                <View style={styles.tileImageWrapper}>
                  <Image
                    source={{ uri: item.url }}
                    style={styles.tileImage}
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={11} color={colors.surface} strokeWidth={3} />
                    </View>
                  )}
                </View>
                <SproutText
                  variant="caption"
                  color={isSelected ? colors.text : colors.muted}
                  weight={isSelected ? '700' : '500'}
                  numberOfLines={1}
                  style={styles.tileLabel}
                >
                  {item.name}
                </SproutText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomSection}>
        <SproutButton
          label="Complete Sign Up"
          isLoading={isSubmitting}
          onPress={() => handleFinish(false)}
          style={styles.submitButton}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleFinish(true)}
          disabled={isSubmitting}
          style={styles.skipLink}
        >
          <SproutText variant="caption" color={colors.muted} weight="600">
            Skip for now (use initials)
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  skipButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  header: {
    marginBottom: spacing.lg,
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
  previewCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.md + 4,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.xl,
    ...shadows.card,
  },
  previewAvatarWrapper: {
    position: 'relative',
    marginRight: spacing.md,
  },
  sparkleBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  previewInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  previewBadge: {
    marginTop: 3,
  },
  phoneHint: {
    marginTop: 4,
    fontSize: 11,
  },
  gridSection: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
  },
  avatarTile: {
    width: '25%',
    padding: 4,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  avatarTileSelected: {
    transform: [{ scale: 1.05 }],
  },
  tileImageWrapper: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
    ...shadows.card,
  },
  tileImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  checkBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  tileLabel: {
    marginTop: 6,
    fontSize: 11,
    textAlign: 'center',
  },
  bottomSection: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  submitButton: {
    marginBottom: 2,
  },
  skipLink: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
