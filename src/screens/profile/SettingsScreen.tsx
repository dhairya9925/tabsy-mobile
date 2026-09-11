import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, shadows } from '../../theme';
import {
  SproutText,
  CircleButton,
  ScreenShell,
  Toast,
} from '../../components';
import { useBudgetStore } from '../../store/useBudgetStore';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeft,
  Coins,
  Scale,
  Palette,
  Target,
  Info,
  Check,
  ShieldCheck,
} from 'lucide-react-native';

const BUDGET_OPTIONS = [15000, 25000, 30000, 50000, 75000];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
  const setMonthlyBudget = useBudgetStore((s) => s.setMonthlyBudget);

  const [toastMessage, setToastMessage] = useState('');

  const handleSelectBudget = (amount: number) => {
    setMonthlyBudget(amount);
    setToastMessage(`Monthly budget pace set to ${formatCurrency(amount)}`);
  };

  return (
    <ScreenShell contentContainerStyle={styles.container}>
      <Toast
        visible={!!toastMessage}
        message={toastMessage}
        type="success"
        onDismiss={() => setToastMessage('')}
      />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <CircleButton
          icon={<ArrowLeft size={20} color={colors.text} />}
          onPress={() => navigation.goBack()}
        />
        <View style={styles.topBarCenter}>
          <SproutText variant="eyebrow" color={colors.accent}>
            PREFERENCES
          </SproutText>
          <SproutText variant="title" color={colors.text}>
            Settings
          </SproutText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* Monthly Budget Pace */}
      <View style={[styles.sectionCard, shadows.card]}>
        <View style={styles.sectionHeader}>
          <Target size={18} color={colors.accent} />
          <SproutText variant="subtitle" color={colors.text} weight="700">
            Monthly Budget Pace Target
          </SproutText>
        </View>
        <SproutText variant="caption" color={colors.muted} style={styles.sectionDesc}>
          Sets the monthly target used by the Rhythm progress ring on your Home screen.
        </SproutText>

        <View style={styles.budgetChipsRow}>
          {BUDGET_OPTIONS.map((amount) => {
            const isSelected = monthlyBudget === amount;
            return (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.budgetChip,
                  isSelected && styles.budgetChipActive,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectBudget(amount)}
              >
                <SproutText
                  variant="caption"
                  color={isSelected ? colors.surface : colors.text}
                  style={isSelected ? styles.chipTextActive : undefined}
                >
                  {formatCurrency(amount)}
                </SproutText>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Currency & Splitting */}
      <View style={[styles.sectionCard, shadows.card]}>
        <View style={styles.sectionHeader}>
          <Coins size={18} color={colors.accent} />
          <SproutText variant="subtitle" color={colors.text} weight="700">
            Currency & Calculation
          </SproutText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Active Currency
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Primary denomination
            </SproutText>
          </View>
          <View style={styles.badgePill}>
            <SproutText variant="monoSm" color={colors.accent}>
              INR (₹)
            </SproutText>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Default Split Method
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Standard allocation
            </SproutText>
          </View>
          <View style={styles.badgePill}>
            <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
              Split Equally
            </SproutText>
          </View>
        </View>
      </View>

      {/* Design System & Aesthetics */}
      <View style={[styles.sectionCard, shadows.card]}>
        <View style={styles.sectionHeader}>
          <Palette size={18} color={colors.accent} />
          <SproutText variant="subtitle" color={colors.text} weight="700">
            Design & Aesthetics
          </SproutText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Theme Palette
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Direction 09 (Sprout)
            </SproutText>
          </View>
          <View style={styles.colorDotsRow}>
            <View style={[styles.colorDot, { backgroundColor: colors.accent }]} />
            <View style={[styles.colorDot, { backgroundColor: colors.sun }]} />
            <View style={[styles.colorDot, { backgroundColor: colors.soft }]} />
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Typography
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Manrope (Sprout standard)
            </SproutText>
          </View>
          <Check size={18} color={colors.accent} />
        </View>
      </View>

      {/* About Section */}
      <View style={[styles.sectionCard, shadows.card]}>
        <View style={styles.sectionHeader}>
          <Info size={18} color={colors.accent} />
          <SproutText variant="subtitle" color={colors.text} weight="700">
            About Tabsy
          </SproutText>
        </View>

        <View style={styles.infoRow}>
          <SproutText variant="body" color={colors.text}>
            App Version
          </SproutText>
          <SproutText variant="monoSm" color={colors.muted}>
            1.0.0 (Native Android)
          </SproutText>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <SproutText variant="body" color={colors.text}>
            Backend Architecture
          </SproutText>
          <SproutText variant="caption" color={colors.muted}>
            FastAPI v1 (Self-Hosted Auth)
          </SproutText>
        </View>

        <View style={styles.divider} />

        <View style={styles.securityRow}>
          <ShieldCheck size={16} color={colors.accent} />
          <SproutText variant="caption" color={colors.muted}>
            Credentials are protected with bcrypt and encrypted SecureStore tokens.
          </SproutText>
        </View>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 60,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  topBarCenter: {
    alignItems: 'center',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionDesc: {
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  budgetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetChip: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  budgetChipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  chipTextActive: {
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoRowLeft: {
    flex: 1,
  },
  badgePill: {
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.line,
  },
  colorDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  divider: {
    height: 1,
    backgroundColor: colors.line,
    marginVertical: 4,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
});
