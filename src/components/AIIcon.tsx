import React, { useState } from 'react';
import {
  Image,
  ImageStyle,
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme';

const mascotLight = require('../../assets/mascot_badge_light.png');
const mascotDark = require('../../assets/mascot_badge_dark.png');

export interface AIIconProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  containerStyle?: StyleProp<ViewStyle>;
  mode?: 'auto' | 'light' | 'dark';
  coverCircle?: boolean;
}

/**
 * Tabsy Mint Mascot Badge AI Icon.
 * Automatically adapts between Light (`mascot_badge_light.png`)
 * and Dark (`mascot_badge_dark.png`) depending on active theme.
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
  const [hasError, setHasError] = useState(false);

  const useDarkMode = mode === 'dark' || (mode === 'auto' && isDark);
  const source = useDarkMode ? mascotDark : mascotLight;

  if (hasError) {
    return (
      <View
        style={[
          {
            width: size,
            height: size,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: useDarkMode ? '#13281C' : '#FDF6E2',
            borderRadius: size / 2,
            borderWidth: 1.5,
            borderColor: useDarkMode ? '#FDCF65' : '#E6D3A3',
          },
          containerStyle,
        ]}
      >
        <Sparkles size={Math.round(size * 0.52)} color="#FDCF65" strokeWidth={2.2} />
      </View>
    );
  }

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
        onError={() => setHasError(true)}
        accessibilityRole="image"
        accessibilityLabel="Tabsy AI Mascot"
      />
    </View>
  );
};
