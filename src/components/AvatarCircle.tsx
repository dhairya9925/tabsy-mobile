import React from 'react';
import { View, Image, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radii } from '../theme';
import { SproutText } from './SproutText';
import { getInitials } from '../utils/formatters';

export interface AvatarCircleProps {
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  size?: number;
  onPress?: () => void;
  style?: ViewStyle;
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

  const content = avatarUrl ? (
    <Image
      source={{ uri: avatarUrl }}
      style={[
        styles.image,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    />
  ) : (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
        style,
      ]}
    >
      <SproutText
        variant="subtitle"
        color={colors.text}
        weight="800"
        style={{ fontSize: size * 0.38 }}
      >
        {initials}
      </SproutText>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
