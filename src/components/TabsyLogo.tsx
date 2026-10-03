import React from 'react';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme';

export interface TabsyLogoProps {
  size?: number;
  color?: string;
}

/**
 * Tabsy stacked-stones logo.
 * Based on official brand assets (Logo_v1.svg / Logo_v1.png):
 *   1. Bottom stone – wide horizontal grounding ellipse (opacity 0.85)
 *   2. Middle stone – medium horizontal balance ellipse (opacity 0.70)
 *   3. Top stone – smooth tilted balance pebble (opacity 0.95)
 */
export const TabsyLogo: React.FC<TabsyLogoProps> = ({
  size = 40,
  color,
}) => {
  const fill = color ?? colors.text;

  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
    >
      {/* Bottom stone – wide horizontal ellipse */}
      <Ellipse cx="50" cy="78" rx="26" ry="12" fill={fill} opacity={0.85} />

      {/* Middle stone – medium horizontal ellipse */}
      <Ellipse cx="50" cy="54" rx="19" ry="10" fill={fill} opacity={0.7} />

      {/* Top stone – smooth tilted balance pebble from Logo_v1 */}
      <Path
        d="M 69.3 26.93 C 70.69 30.3, 65.18 35.75, 57.01 39.11 C 48.83 42.46, 41.08 42.45, 39.7 39.07 C 38.31 35.7, 43.82 30.25, 51.99 26.89 C 60.17 23.54, 67.92 23.55, 69.3 26.93 Z"
        fill={fill}
        opacity={0.95}
      />
    </Svg>
  );
};
