import React from 'react';
import {
  View,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { colors, radii, spacing, shadows, fontFamilies } from '../theme';
import { SproutText } from './SproutText';
import { CircleButton } from './CircleButton';
import { MonthFilterOption, formatMonthTitle } from '../utils/journalGrouping';
import { formatCurrency } from '../utils/formatters';
import { X, Check, Calendar, Layers } from 'lucide-react-native';
import { useThemeStore } from '../store/useThemeStore';

export interface MonthPickerSheetProps {
  visible: boolean;
  selectedMonth: string;
  months: MonthFilterOption[];
  totalExpensesCount: number;
  totalExpensesAmount: number;
  currentMonthKey: string;
  onSelectMonth: (monthKey: string) => void;
  onClose: () => void;
}

export const MonthPickerSheet: React.FC<MonthPickerSheetProps> = ({
  visible,
  selectedMonth,
  months,
  totalExpensesCount,
  totalExpensesAmount,
  currentMonthKey,
  onSelectMonth,
  onClose,
}) => {
  const isDark = useThemeStore((s) => s.isDark);

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

        <View
          style={[
            styles.sheetContainer,
            isDark && styles.sheetContainerDark,
            shadows.modal,
          ]}
        >
          {/* Grab Handle */}
          <View style={[styles.handleBar, isDark && styles.handleBarDark]} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <SproutText variant="eyebrow" color={isDark ? colors.accent : '#355E47'}>
                TIMELINE
              </SproutText>
              <SproutText variant="title" color={isDark ? '#FFFFFF' : colors.text}>
                Select Ledger Month
              </SproutText>
            </View>
            <CircleButton
              icon={<X size={18} color={isDark ? '#FFFFFF' : colors.text} />}
              onPress={onClose}
              accessibilityLabel="Close sheet"
            />
          </View>

          {/* Month List */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. All Months Option */}
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={() => {
                onSelectMonth('all');
                onClose();
              }}
              style={[
                styles.optionRow,
                isDark ? styles.optionRowDark : styles.optionRowLight,
                selectedMonth === 'all' && (isDark ? styles.optionSelectedDark : styles.optionSelectedLight),
              ]}
            >
              <View
                style={[
                  styles.optionIconBox,
                  isDark ? styles.optionIconBoxDark : styles.optionIconBoxLight,
                  selectedMonth === 'all' && (isDark ? styles.iconBoxSelectedDark : styles.iconBoxSelectedLight),
                ]}
              >
                <Layers
                  size={18}
                  color={
                    selectedMonth === 'all'
                      ? (isDark ? '#FFFFFF' : colors.accent)
                      : (isDark ? '#A5D2C8' : colors.muted)
                  }
                />
              </View>

              <View style={styles.optionInfo}>
                <View style={styles.optionTitleRow}>
                  <SproutText
                    style={[
                      styles.optionTitle,
                      isDark && { color: '#FFFFFF' },
                      selectedMonth === 'all' && { fontFamily: fontFamilies.bold },
                    ]}
                  >
                    All Months
                  </SproutText>
                  <View style={[styles.allBadge, isDark && styles.allBadgeDark]}>
                    <SproutText style={[styles.allBadgeText, isDark && { color: colors.accent }]}>
                      All-time
                    </SproutText>
                  </View>
                </View>
                <SproutText
                  variant="caption"
                  color={isDark ? '#A5D2C8' : colors.muted}
                  style={styles.optionSubtitle}
                >
                  {totalExpensesCount} {totalExpensesCount === 1 ? 'expense' : 'expenses'} · {formatCurrency(totalExpensesAmount)} total
                </SproutText>
              </View>

              {selectedMonth === 'all' && (
                <View style={[styles.checkCircle, isDark && styles.checkCircleDark]}>
                  <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                </View>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={[styles.sectionDivider, isDark && styles.sectionDividerDark]}>
              <SproutText variant="eyebrow" color={isDark ? '#608670' : colors.muted}>
                RECORDED MONTHS
              </SproutText>
            </View>

            {/* 2. Individual Months */}
            {months.map((m) => {
              const isSelected = selectedMonth === m.key;
              const isCurrent = m.key === currentMonthKey;

              return (
                <TouchableOpacity
                  key={m.key}
                  activeOpacity={0.75}
                  onPress={() => {
                    onSelectMonth(m.key);
                    onClose();
                  }}
                  style={[
                    styles.optionRow,
                    isDark ? styles.optionRowDark : styles.optionRowLight,
                    isSelected && (isDark ? styles.optionSelectedDark : styles.optionSelectedLight),
                  ]}
                >
                  <View
                    style={[
                      styles.optionIconBox,
                      isDark ? styles.optionIconBoxDark : styles.optionIconBoxLight,
                      isSelected && (isDark ? styles.iconBoxSelectedDark : styles.iconBoxSelectedLight),
                    ]}
                  >
                    <Calendar
                      size={18}
                      color={
                        isSelected
                          ? (isDark ? '#FFFFFF' : colors.accent)
                          : (isDark ? '#A5D2C8' : colors.muted)
                      }
                    />
                  </View>

                  <View style={styles.optionInfo}>
                    <View style={styles.optionTitleRow}>
                      <SproutText
                        style={[
                          styles.optionTitle,
                          isDark && { color: '#FFFFFF' },
                          isSelected && { fontFamily: fontFamilies.bold },
                        ]}
                      >
                        {formatMonthTitle(m.key)}
                      </SproutText>
                      {isCurrent && (
                        <View style={[styles.currentBadge, isDark && styles.currentBadgeDark]}>
                          <SproutText style={[styles.currentBadgeText, isDark && { color: colors.accent }]}>
                            Current
                          </SproutText>
                        </View>
                      )}
                    </View>
                    <SproutText
                      variant="caption"
                      color={isDark ? '#A5D2C8' : colors.muted}
                      style={styles.optionSubtitle}
                    >
                      {m.count} {m.count === 1 ? 'expense' : 'expenses'} · {formatCurrency(m.total)}
                    </SproutText>
                  </View>

                  {isSelected && (
                    <View style={[styles.checkCircle, isDark && styles.checkCircleDark]}>
                      <Check size={14} color="#FFFFFF" strokeWidth={2.5} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(24, 50, 40, 0.45)',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
    maxHeight: '75%',
  },
  sheetContainerDark: {
    backgroundColor: '#162820',
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.line,
    alignSelf: 'center',
    marginVertical: spacing.sm,
  },
  handleBarDark: {
    backgroundColor: '#284637',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    marginBottom: spacing.xs,
  },
  headerTitles: {
    gap: 2,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  sectionDivider: {
    marginTop: spacing.xs,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionDividerDark: {
    opacity: 0.8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1.5,
  },
  optionRowLight: {
    backgroundColor: '#F8FAF6',
    borderColor: colors.line,
  },
  optionRowDark: {
    backgroundColor: '#1E362A',
    borderColor: '#2D4C3A',
  },
  optionSelectedLight: {
    backgroundColor: '#EDF5EB',
    borderColor: colors.accent,
  },
  optionSelectedDark: {
    backgroundColor: '#244534',
    borderColor: colors.accent,
  },
  optionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  optionIconBoxLight: {
    backgroundColor: '#E7EFE4',
  },
  optionIconBoxDark: {
    backgroundColor: '#284637',
  },
  iconBoxSelectedLight: {
    backgroundColor: '#D8E8CB',
  },
  iconBoxSelectedDark: {
    backgroundColor: '#355E47',
  },
  optionInfo: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: fontFamilies.semiBold,
    color: colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  currentBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    backgroundColor: '#D8E8CB',
  },
  currentBadgeDark: {
    backgroundColor: '#284637',
  },
  currentBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#235634',
  },
  allBadge: {
    paddingHorizontal: 7,
    paddingVertical: 1.5,
    borderRadius: radii.full,
    backgroundColor: '#E4EFE0',
  },
  allBadgeDark: {
    backgroundColor: '#284637',
  },
  allBadgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    color: '#355E47',
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  checkCircleDark: {
    backgroundColor: colors.accent,
  },
});
