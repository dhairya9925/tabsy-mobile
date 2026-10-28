import React from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';

const mascotLight = require('../../assets/Cute Mint Mascot Badge (1).png');
const mascotDark = require('../../assets/Cute Mint Mascot Badge-Dark.png');

export interface AIIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  mode?: 'auto' | 'light' | 'dark';
  coverCircle?: boolean;
}

/**
 * Tabsy Mint Mascot Badge AI Icon.
 * Automatically adapts between Light (`Cute Mint Mascot Badge (1).png`)
 * and Dark (`Cute Mint Mascot Badge-Dark.png`) depending on active theme.
 * When `coverCircle` is true, scales the graphic to flush-cover the entire circular boundary.
 */
export const AIIcon: React.FC<AIIconProps> = ({
  size = 24,
  style,
  containerStyle,
  mode = 'auto',
  coverCircle = false,
}) => {
  const { isDark } = useTheme();

  const useDarkMode = mode === 'dark' || (mode === 'auto' && isDark);
  const source = useDarkMode ? mascotDark : mascotLight;

  // The mascot graphic has ~10% transparent padding around its outer ring in the 1254x1254 canvas.
  // When coverCircle is enabled, we scale up by 1.25 and clip to borderRadius to make the badge
  // cover the entire circle edge-to-edge.
  const imageSize = coverCircle ? Math.round(size * 1.25) : size;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: coverCircle ? 'hidden' : undefined,
          borderRadius: coverCircle ? size / 2 : undefined,
        },
        containerStyle,
      ]}
    >
      <Image
        source={source}
        style={[
          {
            width: imageSize,
            height: imageSize,
            resizeMode: 'contain',
          },
          style,
        ]}
        accessibilityRole="image"
        accessibilityLabel="Tabsy AI Mascot"
      />
    </View>
  );
};
