import React, { useState, useEffect } from 'react';
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
  const [imageError, setImageError] = useState(false);
  const initials = getInitials(name, email);

  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const hasValidUrl = Boolean(
    avatarUrl &&
    typeof avatarUrl === 'string' &&
    avatarUrl.trim().length > 0 &&
    (avatarUrl.startsWith('http://') ||
      avatarUrl.startsWith('https://') ||
      avatarUrl.startsWith('data:') ||
      avatarUrl.startsWith('file://'))
  );

  const renderCircle = () => {
    if (hasValidUrl && !imageError) {
      return (
        <Image
          source={{ uri: avatarUrl!.trim() }}
          onError={() => setImageError(true)}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
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
          },
        ]}
      >
        <SproutText
          variant="subtitle"
          color={colors.text}
          weight="800"
          style={{
            fontSize: Math.round(size * 0.38),
            lineHeight: Math.round(size * 0.44),
            textAlign: 'center',
            includeFontPadding: false,
          }}
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
    borderWidth: 1.5,
    borderColor: '#E6D3A3',
    overflow: 'hidden',
  },
  image: {
    backgroundColor: colors.sun,
    borderWidth: 1.5,
    borderColor: '#E6D3A3',
    overflow: 'hidden',
  },
});

