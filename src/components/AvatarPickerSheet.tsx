import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
} from 'react-native';
import { colors, radii, spacing, shadows } from '../theme';
import { SproutText } from './SproutText';
import { CircleButton } from './CircleButton';
import { AVATAR_KEYS, AVATAR_MAP, extractAvatarKey } from '../utils/avatarRegistry';
import { X, Check, Trash2 } from 'lucide-react-native';

export interface AvatarPickerSheetProps {
  visible: boolean;
  selected?: string | null;
  onSelect: (avatarKey: string | null) => void;
  onClose: () => void;
}

export const AvatarPickerSheet: React.FC<AvatarPickerSheetProps> = ({
  visible,
  selected,
  onSelect,
  onClose,
}) => {
  const normalizedSelected = extractAvatarKey(selected);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.sheetContainer, shadows.card]}>
          {/* Grab Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <SproutText variant="eyebrow" color={colors.accent}>
                PROFILE PICTURE
              </SproutText>
              <SproutText variant="title" color={colors.text}>
                Choose Avatar
              </SproutText>
            </View>
            <CircleButton
              icon={<X size={18} color={colors.text} />}
              onPress={onClose}
            />
          </View>

          {/* Avatar Grid */}
          <ScrollView
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {AVATAR_KEYS.map((key) => {
              const isSelected = normalizedSelected === key;
              const source = AVATAR_MAP[key];

              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.avatarItem,
                    isSelected && styles.avatarItemSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => onSelect(key)}
                  accessibilityLabel={`Select ${key}`}
                  accessibilityRole="button"
                >
                  <Image
                    source={source}
                    style={styles.avatarImage}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Check size={12} color={colors.surface} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Optional: Remove Avatar Button */}
          {!!selected && (
            <TouchableOpacity
              style={styles.removeButton}
              activeOpacity={0.7}
              onPress={() => onSelect(null)}
            >
              <Trash2 size={16} color={colors.negative} />
              <SproutText variant="buttonSm" color={colors.negative}>
                Use Initials (Remove Avatar)
              </SproutText>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
};

const SCREEN_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(24, 50, 40, 0.45)', // Tinted botanical dark overlay
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.line,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: SCREEN_HEIGHT * 0.75,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerTitles: {
    flex: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  avatarItem: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2.5,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    backgroundColor: colors.background,
  },
  avatarItemSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  avatarImage: {
    width: 58,
    height: 58,
    borderRadius: 29,
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
