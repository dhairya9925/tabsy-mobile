import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Svg, { Rect, Line, Text as SvgText, G, Path } from 'react-native-svg';
import { MonthlyTrendPoint } from '../../types';
import { colors, chartColors, radii, spacing, fontFamilies } from '../../theme';
import { SproutText } from '../SproutText';
import { formatCurrencyExact, formatCurrency } from '../../utils/formatters';

interface SixMonthTrendChartProps {
  data: MonthlyTrendPoint[];
  width?: number;
  height?: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getRoundedBarPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTop: number,
  rBottom: number
): string {
  if (h <= 0 || w <= 0) return '';
  const rt = Math.min(rTop, w / 2, h / 2);
  const rb = Math.min(rBottom, w / 2, h / 2);

  let d = `M ${x + rt} ${y} `;
  d += `H ${x + w - rt} `;
  if (rt > 0) {
    d += `A ${rt} ${rt} 0 0 1 ${x + w} ${y + rt} `;
  }
  d += `V ${y + h - rb} `;
  if (rb > 0) {
    d += `A ${rb} ${rb} 0 0 1 ${x + w - rb} ${y + h} `;
  }
  d += `H ${x + rb} `;
  if (rb > 0) {
    d += `A ${rb} ${rb} 0 0 1 ${x} ${y + h - rb} `;
  }
  d += `V ${y + rt} `;
  if (rt > 0) {
    d += `A ${rt} ${rt} 0 0 1 ${x + rt} ${y} `;
  }
  d += 'Z';
  return d.trim();
}

export const SixMonthTrendChart: React.FC<SixMonthTrendChartProps> = ({
  data,
  width: propWidth,
  height = 180,
}) => {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);

  const [renderedData, setRenderedData] = useState<MonthlyTrendPoint[]>(data);
  const prevDataRef = useRef<MonthlyTrendPoint[]>(data);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    const prevData = prevDataRef.current;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    const duration = 320;
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(1, elapsed / duration);
      const t = easeOutCubic(progress);

      const current = data.map((point, i) => {
        const prev = prevData[i] || { personal: 0, groupShare: 0, total: 0 };
        const personal = prev.personal + (point.personal - prev.personal) * t;
        const groupShare = prev.groupShare + (point.groupShare - prev.groupShare) * t;
        const total = prev.total + (point.total - prev.total) * t;
        return {
          ...point,
          personal: Math.max(0, personal),
          groupShare: Math.max(0, groupShare),
          total: Math.max(0, total),
        };
      });

      setRenderedData(current);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevDataRef.current = data;
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [data]);

  const effectiveWidth = propWidth || containerWidth || 320;

  const paddingTop = 20;
  const paddingBottom = 28;
  const paddingLeft = 14;
  const paddingRight = 14;

  const chartWidth = Math.max(0, effectiveWidth - paddingLeft - paddingRight);
  const chartHeight = height - paddingTop - paddingBottom;
  const chartBottom = height - paddingBottom;

  const maxTotal = Math.max(
    ...renderedData.map((d) => d.total),
    100 // fallback minimum scale
  );

  const colWidth = chartWidth / (renderedData.length || 1);
  const barWidth = Math.min(26, Math.max(14, colWidth * 0.56));

  const activePoint = selectedIdx !== null && selectedIdx >= 0 && selectedIdx < data.length
    ? data[selectedIdx]
    : null;

  return (
    <View
      style={styles.wrapper}
      onLayout={(e) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0 && Math.abs(w - containerWidth) > 1) {
          setContainerWidth(w);
        }
      }}
    >
      {/* Fixed-height inspection strip prevents chart layout shifts */}
      <View style={[styles.inspectionStrip, activePoint ? styles.inspectionStripActive : styles.inspectionStripDefault]}>
        {activePoint ? (
          <>
            <View style={styles.tooltipRow}>
              <SproutText variant="eyebrow" color={chartColors.personal}>
                {activePoint.label.toUpperCase()}
              </SproutText>
              <SproutText style={styles.tooltipTotal}>
                {formatCurrencyExact(activePoint.total)}
              </SproutText>
            </View>
            <View style={styles.tooltipSubRow}>
              <SproutText variant="caption" color={colors.muted}>
                Personal: {formatCurrency(activePoint.personal)} · Group: {formatCurrency(activePoint.groupShare)}
              </SproutText>
            </View>
          </>
        ) : (
          <SproutText variant="caption" color={colors.muted} style={styles.hintText}>
            Tap a bar to inspect monthly breakdown
          </SproutText>
        )}
      </View>

      {/* SVG Canvas */}
      <View style={{ width: effectiveWidth, height, alignSelf: 'center' }}>
        <Svg width={effectiveWidth} height={height}>
          <G>
            {/* Quiet solid hairline grid lines */}
            {[0, 0.5, 1].map((ratio) => {
              const y = chartBottom - chartHeight * ratio;
              return (
                <Line
                  key={`grid-${ratio}`}
                  x1={paddingLeft}
                  y1={y}
                  x2={effectiveWidth - paddingRight}
                  y2={y}
                  stroke={colors.line}
                  strokeWidth={StyleSheet.hairlineWidth}
                />
              );
            })}

            {/* Bars and Month Labels */}
            {renderedData.map((point, index) => {
              const cx = paddingLeft + index * colWidth + colWidth / 2;
              const x = cx - barWidth / 2;

              const personalH = (point.personal / maxTotal) * chartHeight;
              const groupH = (point.groupShare / maxTotal) * chartHeight;

              const personalY = chartBottom - personalH;
              const groupY = personalY - groupH;

              const isSelected = selectedIdx === index;
              const hasSpend = point.total > 0;

              // Outer-only rounding: flush join where personal and group share meet
              const personalPath = personalH > 0
                ? getRoundedBarPath(x, personalY, barWidth, personalH, groupH > 0 ? 0 : 3.5, 3.5)
                : '';
              const groupPath = groupH > 0
                ? getRoundedBarPath(x, groupY, barWidth, groupH, 3.5, personalH > 0 ? 0 : 3.5)
                : '';

              return (
                <G key={point.key}>
                  {/* Selection highlight wash */}
                  {isSelected && (
                    <Rect
                      x={cx - colWidth / 2}
                      y={paddingTop}
                      width={colWidth}
                      height={chartHeight}
                      fill={chartColors.selectedWash}
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
                      fill={chartColors.track}
                      rx={1.5}
                    />
                  )}

                  {/* Personal bar (Bottom segment - moss green) */}
                  {personalH > 0 && (
                    <Path
                      d={personalPath}
                      fill={chartColors.personal}
                    />
                  )}

                  {/* Group Share bar (Top segment - muted slate-blue) */}
                  {groupH > 0 && (
                    <Path
                      d={groupPath}
                      fill={chartColors.groupShare}
                    />
                  )}

                  {/* Month Label with Manrope typography */}
                  <SvgText
                    x={cx}
                    y={height - 8}
                    fontSize={11}
                    fontFamily={isSelected ? fontFamilies.bold : fontFamilies.medium}
                    fill={isSelected ? colors.text : colors.muted}
                    fontWeight={isSelected ? '700' : '500'}
                    textAnchor="middle"
                  >
                    {point.label.split(' ')[0]}
                  </SvgText>
                </G>
              );
            })}
          </G>
        </Svg>

        {/* Touchable overlay for selecting bars with accessibility */}
        <View style={[StyleSheet.absoluteFill, { flexDirection: 'row', paddingLeft, paddingRight }]}>
          {data.map((point, index) => {
            const isSelected = selectedIdx === index;
            return (
              <TouchableOpacity
                key={`touch-${index}`}
                activeOpacity={0.7}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${point.label}: ${formatCurrencyExact(point.total)} total; Personal ${formatCurrencyExact(point.personal)}; Group Share ${formatCurrencyExact(point.groupShare)}`}
                accessibilityState={{ selected: isSelected }}
                onPress={() => setSelectedIdx(selectedIdx === index ? null : index)}
                style={{ width: colWidth, height }}
              />
            );
          })}
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: chartColors.personal }]} />
          <SproutText variant="caption" color={colors.muted}>
            Personal
          </SproutText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: chartColors.groupShare }]} />
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
  inspectionStrip: {
    height: 52,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginBottom: spacing.xs,
    justifyContent: 'center',
  },
  inspectionStripDefault: {
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  inspectionStripActive: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
  },
  hintText: {
    fontFamily: fontFamilies.medium,
    textAlign: 'center',
    fontSize: 12,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tooltipTotal: {
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    color: colors.text,
  },
  tooltipSubRow: {
    marginTop: 2,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
