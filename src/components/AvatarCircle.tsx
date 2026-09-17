import React from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radii } from '../theme';
import { SproutText } from './SproutText';
import { getInitials } from '../utils/formatters';
import { resolveAvatar } from '../utils/avatarRegistry';

export interface AvatarCircleProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
  style?: ViewStyle;
}

const AVATAR_PALETTES = [
  { bg: '#D8E8CB', text: '#214D32' }, // Sage Green
  { bg: '#E2DBF7', text: '#3E2E6B' }, // Soft Lavender
  { bg: '#D6EAF8', text: '#1B4965' }, // Sky Blue
  { bg: '#FCE7D6', text: '#7A3E1D' }, // Peach Amber
  { bg: '#D1F2EB', text: '#116149' }, // Cool Teal
  { bg: '#FADBD8', text: '#78281F' }, // Rose Coral
  { bg: '#FCF3CF', text: '#7D6608' }, // Warm Honey
  { bg: '#E8DAEF', text: '#5B2C6F' }, // Heather Plum
  { bg: '#D5F5E3', text: '#196F3D' }, // Mint Emerald
  { bg: '#D0ECE7', text: '#165B50' }, // Ocean Fog
];

function getAvatarColors(name?: string | null, email?: string | null) {
  const str = (name || email || 'A').trim();
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) & 0xffffffff;
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

export const AvatarCircle: React.FC<AvatarCircleProps> = ({
  name,
  email,
  avatarUrl,
  size = 44,
  onPress,
  style,
}) => {
  const initials = getInitials(name, email);
  const avatarColors = getAvatarColors(name, email);

  const renderCircle = () => {
    const bundled = resolveAvatar(avatarUrl);
    if (bundled) {
      return (
        <Image
          source={bundled}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          resizeMode="cover"
        />
      );
    }

    if (avatarUrl) {
      return (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
          resizeMode="cover"
        />
      );
    }

    return (
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColors.bg,
          },
        ]}
      >
        <SproutText
          variant="subtitle"
          color={avatarColors.text}
          weight="800"
          style={{ fontSize: size * 0.4 }}
        >
          {initials}
        </SproutText>
      </View>
    );
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={style}
        accessibilityRole="button"
        accessibilityLabel="View profile"
      >
        {renderCircle()}
      </TouchableOpacity>
    );
  }

  return style ? <View style={style}>{renderCircle()}</View> : renderCircle();
};

const styles = StyleSheet.create({
  circle: {
    backgroundColor: colors.sun,
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    backgroundColor: colors.sun,
  },
});
