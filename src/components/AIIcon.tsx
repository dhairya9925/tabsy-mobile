import React, { useState } from 'react';
import {
  StyleProp,
  View,
  ViewStyle,
} from 'react-native';
import { SvgXml } from 'react-native-svg';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '../theme';
import {
  MASCOT_BADGE_LIGHT_SVG,
  MASCOT_BADGE_DARK_SVG,
} from '../assets/mascotBadgeSvg';

export interface AIIconProps {
  size?: number;
  style?: StyleProp<ViewStyle | any>;
  containerStyle?: StyleProp<ViewStyle>;
  mode?: 'auto' | 'light' | 'dark';
  coverCircle?: boolean;
}

/**
 * Tabsy Mint Mascot Badge AI Icon.
 * Uses high-fidelity vector SVG embedded directly into the JS bundle,
 * guaranteeing instantaneous, sharp, and reliable rendering in:
 * - Local Metro development (`expo start -a`)
 * - Native Android release/debug standalone builds
 * - Offline environments
 * Automatically adapts between Light and Dark mascot variants depending on active theme.
 * When `coverCircle` is true, scales the graphic to flush-cover the circular boundary.
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
  const xml = useDarkMode ? MASCOT_BADGE_DARK_SVG : MASCOT_BADGE_LIGHT_SVG;

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
  const svgSize = coverCircle ? Math.round(size * 1.25) : size;

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
      accessibilityRole="image"
      accessibilityLabel="Tabsy AI Mascot"
    >
      <View style={style}>
        <SvgXml
          xml={xml}
          width={svgSize}
          height={svgSize}
          onError={() => setHasError(true)}
        />
      </View>
    </View>
  );
};

