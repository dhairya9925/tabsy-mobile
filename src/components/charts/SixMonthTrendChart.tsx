import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G } from 'react-native-svg';
import { MonthlyTrendPoint } from '../../types';
import { colors, radii, spacing } from '../../theme';
import { SproutText } from '../SproutText';
import { formatCurrencyExact, formatCurrency } from '../../utils/formatters';

interface SixMonthTrendChartProps {
  data: MonthlyTrendPoint[];
  width?: number;
  height?: number;
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const SixMonthTrendChart: React.FC<SixMonthTrendChartProps> = ({
  data,
  width = SCREEN_WIDTH - 48,
  height = 180,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const paddingTop = 24;
  const paddingBottom = 28;
  const paddingLeft = 14;
  const paddingRight = 14;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartBottom = height - paddingBottom;

  const maxTotal = Math.max(
    ...data.map((d) => d.total),
    100 // fallback minimum scale
  );

  const colWidth = chartWidth / (data.length || 1);
  const barWidth = Math.min(26, colWidth * 0.58);

  const activePoint = selectedIdx !== null && selectedIdx >= 0 && selectedIdx < data.length
    ? data[selectedIdx]
    : null;

  return (
    <View style={styles.wrapper}>
      {/* Selected month tooltip banner */}
      {activePoint ? (
        <View style={styles.tooltipCard}>
          <View style={styles.tooltipRow}>
            <SproutText variant="eyebrow" color={colors.accent}>
              {activePoint.label}
            </SproutText>
            <SproutText variant="monoSm" color={colors.text}>
              {formatCurrencyExact(activePoint.total)}
            </SproutText>
          </View>
          <View style={styles.tooltipSubRow}>
            <SproutText variant="caption" color={colors.muted}>
              Personal: {formatCurrency(activePoint.personal)} · Group: {formatCurrency(activePoint.groupShare)}
            </SproutText>
          </View>
        </View>
      ) : (
        <View style={styles.tooltipPlaceholder}>
          <SproutText variant="caption" color={colors.muted}>
            Tap any bar to inspect monthly breakdown
          </SproutText>
        </View>
      )}

      {/* SVG Canvas */}
      <View style={{ width, height, alignSelf: 'center' }}>
        <Svg width={width} height={height}>
          <G>
            {/* Horizontal Grid lines */}
            {[0, 0.5, 1].map((ratio) => {
              const y = chartBottom - chartHeight * ratio;
              return (
                <Line
                  key={`grid-${ratio}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke={colors.line}
                  strokeDasharray="3 3"
                  strokeWidth={1}
                />
              );
            })}

            {/* Bars and Month Labels */}
            {data.map((point, index) => {
              const cx = paddingLeft + index * colWidth + colWidth / 2;
              const x = cx - barWidth / 2;

              const personalH = (point.personal / maxTotal) * chartHeight;
              const groupH = (point.groupShare / maxTotal) * chartHeight;
              const totalH = personalH + groupH;

              const personalY = chartBottom - personalH;
              const groupY = personalY - groupH;

              const isSelected = selectedIdx === index;
              const hasSpend = point.total > 0;

              return (
                <G key={point.key}>
                  {/* Selection highlight track */}
                  {isSelected && (
                    <Rect
                      x={cx - colWidth / 2}
                      y={paddingTop}
                      width={colWidth}
                      height={chartHeight}
                      fill={colors.background}
                      opacity={0.7}
                      rx={6}
                    />
                  )}

                  {/* Empty bar placeholder notch */}
                  {!hasSpend && (
                    <Rect
                      x={x}
                      y={chartBottom - 3}
                      width={barWidth}
                      height={3}
                      fill={colors.line}
                      rx={1.5}
                    />
                  )}

                  {/* Personal bar (Bottom segment) */}
                  {personalH > 0 && (
                    <Rect
                      x={x}
                      y={personalY}
                      width={barWidth}
                      height={personalH}
                      fill={colors.accent}
                      rx={groupH > 0 ? 0 : 4}
                    />
                  )}

                  {/* Group Share bar (Top segment) */}
                  {groupH > 0 && (
                    <Rect
                      x={x}
                      y={groupY}
                      width={barWidth}
                      height={groupH}
                      fill="#6366F1"
                      rx={4}
                    />
                  )}

                  {/* Month Label */}
                  <SvgText
                    x={cx}
                    y={height - 8}
                    fontSize={11}
                    fill={isSelected ? colors.text : colors.muted}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    textAnchor="middle"
                  >
                    {point.label.split(' ')[0]}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Touchable overlay for selecting bars */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', paddingLeft, paddingRight }]}>
          {data.map((_, index) => (
            <TouchableOpacity
              key={`touch-${index}`}
              activeOpacity={0.7}
              onPress={() => setSelectedIdx(selectedIdx === index ? null : index)}
              style={{ width: colWidth, height }}
            />
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: colors.accent }]} />
          <SproutText variant="caption" color={colors.muted}>
            Personal
          </SproutText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
          <SproutText variant="caption" color={colors.muted}>
            Group Share
          </SproutText>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  tooltipCard: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: spacing.xs,
  },
  tooltipPlaceholder: {
    paddingVertical: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltipSubRow: {
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 9,
    height: 9,
    borderRadius: 2.5,
  },
});
