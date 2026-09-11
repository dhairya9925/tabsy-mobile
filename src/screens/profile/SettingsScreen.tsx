import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  TextInput,
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
import { useThemeStore } from '../../store/useThemeStore';
import { THEME_PALETTES, PaletteKey } from '../../theme/tokens';
import { TYPOGRAPHY_PRESETS, TypographyKey } from '../../theme/typography';
import { formatCurrency } from '../../utils/formatters';
import {
  ArrowLeft,
  Coins,
  Palette,
  Target,
  Info,
  Check,
  ShieldCheck,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  X,
  Edit3,
} from 'lucide-react-native';

const GENERIC_BUDGET_OPTIONS = [15000, 25000, 30000, 40000, 50000, 75000, 100000];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
  const customBudgets = useBudgetStore((s) => s.customBudgets);
  const setMonthlyBudget = useBudgetStore((s) => s.setMonthlyBudget);
  const addCustomBudget = useBudgetStore((s) => s.addCustomBudget);

  const paletteId = useThemeStore((s) => s.paletteId);
  const typographyId = useThemeStore((s) => s.typographyId);
  const isDefault = useThemeStore((s) => s.isDefault);
  const setPalette = useThemeStore((s) => s.setPalette);
  const setTypography = useThemeStore((s) => s.setTypography);
  const resetToDefault = useThemeStore((s) => s.resetToDefault);

  const [toastMessage, setToastMessage] = useState('');
  const [isPalettePickerOpen, setIsPalettePickerOpen] = useState(false);
  const [isTypographyPickerOpen, setIsTypographyPickerOpen] = useState(false);

  // Dynamic Custom Budget Input State
  const [isCustomInputOpen, setIsCustomInputOpen] = useState(false);
  const [customInputText, setCustomInputText] = useState('');
  const [customInputError, setCustomInputError] = useState('');
  const [justSavedTarget, setJustSavedTarget] = useState(false);

  // Combine standard generic tiers with user custom budgets
  const allBudgetOptions = useMemo(() => {
    const set = new Set([...GENERIC_BUDGET_OPTIONS, ...customBudgets]);
    if (monthlyBudget) set.add(monthlyBudget);
    return Array.from(set).sort((a, b) => a - b);
  }, [customBudgets, monthlyBudget]);

  const handleSelectBudget = (amount: number) => {
    setMonthlyBudget(amount);
    setJustSavedTarget(true);
    setTimeout(() => setJustSavedTarget(false), 3000);
    setToastMessage(`Monthly budget pace target set to ${formatCurrency(amount)}`);
  };

  const handleOpenCustomInput = () => {
    setIsCustomInputOpen(true);
    setCustomInputText(monthlyBudget ? String(monthlyBudget) : '');
    setCustomInputError('');
  };

  const handleSaveCustomBudget = () => {
    const parsed = parseInt(customInputText, 10);
    if (isNaN(parsed) || parsed < 1000) {
      setCustomInputError('Please enter an amount of at least ₹1,000');
      return;
    }
    if (parsed > 10000000) {
      setCustomInputError('Target amount exceeds maximum limit of ₹1,00,00,000');
      return;
    }

    addCustomBudget(parsed);
    setIsCustomInputOpen(false);
    setCustomInputText('');
    setCustomInputError('');
    setJustSavedTarget(true);
    setTimeout(() => setJustSavedTarget(false), 3500);
    setToastMessage(`Monthly budget pace target saved to ${formatCurrency(parsed)}`);
  };

  const handleAdjustCustomDraft = (delta: number) => {
    const current = parseInt(customInputText, 10) || monthlyBudget || 30000;
    const updated = Math.max(1000, current + delta);
    setCustomInputText(String(updated));
    setCustomInputError('');
  };

  const handleSelectPalette = (key: PaletteKey) => {
    setPalette(key);
    setToastMessage(`Theme palette set to ${THEME_PALETTES[key].name}`);
  };

  const handleSelectTypography = (key: TypographyKey) => {
    setTypography(key);
    setToastMessage(`Typography set to ${TYPOGRAPHY_PRESETS[key].name}`);
  };

  const handleResetToDefault = () => {
    resetToDefault();
    setToastMessage('Theme reset to Sprout Direction 09 & Manrope default');
  };

  const currentPalette = THEME_PALETTES[paletteId] || THEME_PALETTES.sprout;
  const currentTypography = TYPOGRAPHY_PRESETS[typographyId] || TYPOGRAPHY_PRESETS.manrope;

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
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeader}>
            <Target size={18} color={colors.accent} />
            <SproutText variant="subtitle" color={colors.text} weight="700">
              Monthly Budget Pace Target
            </SproutText>
          </View>
          <View
            style={[
              styles.badgePill,
              {
                backgroundColor: justSavedTarget ? colors.soft : colors.accentSoft,
                borderColor: justSavedTarget ? colors.accent : 'transparent',
              },
            ]}
          >
            {justSavedTarget ? (
              <View style={styles.badgeRow}>
                <Check size={12} color={colors.accent} style={{ marginRight: 4 }} />
                <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700', fontSize: 11 }}>
                  Saved ✓
                </SproutText>
              </View>
            ) : (
              <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700', fontSize: 11 }}>
                Set & Active
              </SproutText>
            )}
          </View>
        </View>

        <SproutText variant="caption" color={colors.muted} style={styles.sectionDesc}>
          Sets the monthly target used by the Rhythm progress ring on your Home screen to pace everyday spending.
        </SproutText>

        {/* Current Active Target Banner */}
        <View
          style={[
            styles.activeBudgetBanner,
            {
              backgroundColor: colors.background,
              borderColor: justSavedTarget ? colors.accent : colors.line,
            },
          ]}
        >
          <View style={styles.activeBudgetBannerLeft}>
            <View style={[styles.targetIconCircle, { backgroundColor: colors.surface }]}>
              <Target size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <SproutText variant="eyebrow" color={colors.muted}>
                CURRENT ACTIVE TARGET
              </SproutText>
              <SproutText variant="amount" color={colors.text} style={{ fontSize: 22, marginTop: 2 }}>
                {formatCurrency(monthlyBudget)}
                <SproutText variant="caption" color={colors.muted}>
                  {' '}/ month
                </SproutText>
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
                Recommended pace: ~{formatCurrency(Math.round(monthlyBudget / 30))}/day
              </SproutText>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.customEditTrigger, { borderColor: colors.line, backgroundColor: colors.surface }]}
            activeOpacity={0.7}
            onPress={handleOpenCustomInput}
          >
            <Edit3 size={14} color={colors.accent} />
            <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700', marginLeft: 4 }}>
              Custom
            </SproutText>
          </TouchableOpacity>
        </View>

        {/* Generic & Custom Budget Chips */}
        <SproutText variant="caption" color={colors.muted} style={{ marginBottom: 8, fontWeight: '600' }}>
          Select standard tier or custom pace:
        </SproutText>
        <View style={styles.budgetChipsRow}>
          {allBudgetOptions.map((amount) => {
            const isSelected = monthlyBudget === amount;
            const isCustom = !GENERIC_BUDGET_OPTIONS.includes(amount);
            return (
              <TouchableOpacity
                key={amount}
                style={[
                  styles.budgetChip,
                  { backgroundColor: colors.background, borderColor: colors.line },
                  isSelected && [styles.budgetChipActive, { backgroundColor: colors.accent, borderColor: colors.accent }],
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectBudget(amount)}
              >
                <View style={styles.chipContentRow}>
                  {isSelected && (
                    <Check size={12} color={colors.onAccent} style={{ marginRight: 4 }} />
                  )}
                  <SproutText
                    variant="caption"
                    color={isSelected ? colors.onAccent : colors.text}
                    style={isSelected ? styles.chipTextActive : undefined}
                  >
                    {formatCurrency(amount)}
                  </SproutText>
                  {isCustom && (
                    <View
                      style={[
                        styles.chipCustomTag,
                        { backgroundColor: isSelected ? 'rgba(255,255,255,0.25)' : colors.surface },
                      ]}
                    >
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : colors.muted}
                        style={{ fontSize: 9, fontWeight: '700' }}
                      >
                        CUSTOM
                      </SproutText>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* "+ Custom" Action Chip */}
          <TouchableOpacity
            style={[
              styles.budgetChip,
              styles.addCustomChip,
              {
                backgroundColor: isCustomInputOpen ? colors.accentSoft : colors.background,
                borderColor: isCustomInputOpen ? colors.accent : colors.line,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setIsCustomInputOpen(!isCustomInputOpen)}
          >
            <Plus size={13} color={colors.accent} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
              Custom target
            </SproutText>
          </TouchableOpacity>
        </View>

        {/* Expandable Custom Budget Input Form */}
        {isCustomInputOpen && (
          <View style={[styles.customFormContainer, { backgroundColor: colors.background, borderColor: colors.accent }]}>
            <View style={styles.customFormHeader}>
              <View>
                <SproutText variant="body" color={colors.text} weight="700">
                  Set Custom Monthly Target
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Enter exact monthly budget pace in INR (₹)
                </SproutText>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setIsCustomInputOpen(false);
                  setCustomInputError('');
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={18} color={colors.muted} />
              </TouchableOpacity>
            </View>

            {/* Numeric Input */}
            <View style={[styles.customInputRow, { backgroundColor: colors.surface, borderColor: customInputError ? colors.negative : colors.line }]}>
              <SproutText variant="title" color={colors.accent} style={{ fontWeight: '800', marginRight: 6 }}>
                ₹
              </SproutText>
              <TextInput
                style={[styles.customTextInput, { color: colors.text }]}
                value={customInputText}
                onChangeText={(text) => {
                  setCustomInputText(text.replace(/[^0-9]/g, ''));
                  setCustomInputError('');
                }}
                placeholder="e.g. 45000"
                placeholderTextColor={colors.muted}
                keyboardType="numeric"
                autoFocus
              />
              {!!customInputText && (
                <TouchableOpacity onPress={() => setCustomInputText('')}>
                  <X size={16} color={colors.muted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Live Indication: Unsaved Draft Preview */}
            {!!customInputText && parseInt(customInputText, 10) > 0 && (
              <View style={[styles.draftIndicationBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                <View style={styles.draftBadgeRow}>
                  <View style={[styles.draftIndicatorDot, { backgroundColor: colors.sun }]} />
                  <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, fontWeight: '700' }}>
                    UNSAVED TARGET DRAFT
                  </SproutText>
                </View>
                <SproutText variant="body" color={colors.text} weight="700" style={{ marginTop: 2 }}>
                  {formatCurrency(parseInt(customInputText, 10))} / month
                </SproutText>
                <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
                  Daily pace: ~{formatCurrency(Math.round(parseInt(customInputText, 10) / 30))}/day
                  {monthlyBudget !== parseInt(customInputText, 10) && (
                    ` (${parseInt(customInputText, 10) > monthlyBudget ? '+' : ''}${formatCurrency(parseInt(customInputText, 10) - monthlyBudget)} vs current)`
                  )}
                </SproutText>
              </View>
            )}

            {/* Error Message */}
            {!!customInputError && (
              <SproutText variant="caption" color={colors.negative} style={{ marginTop: 4, fontWeight: '600' }}>
                {customInputError}
              </SproutText>
            )}

            {/* Quick Increment/Decrement Adjustments */}
            <View style={styles.quickAdjustRow}>
              <SproutText variant="caption" color={colors.muted} style={{ marginRight: 6 }}>
                Adjust:
              </SproutText>
              {[-5000, 5000, 10000, 25000].map((delta) => (
                <TouchableOpacity
                  key={delta}
                  style={[styles.quickAdjustChip, { backgroundColor: colors.surface, borderColor: colors.line }]}
                  activeOpacity={0.7}
                  onPress={() => handleAdjustCustomDraft(delta)}
                >
                  <SproutText variant="caption" color={colors.text} style={{ fontSize: 11, fontWeight: '600' }}>
                    {delta > 0 ? `+₹${delta / 1000}k` : `-₹${Math.abs(delta) / 1000}k`}
                  </SproutText>
                </TouchableOpacity>
              ))}
            </View>

            {/* Action Buttons: Cancel and Save Target */}
            <View style={styles.customFormActionsRow}>
              <TouchableOpacity
                style={[styles.customFormCancelBtn, { borderColor: colors.line }]}
                activeOpacity={0.7}
                onPress={() => {
                  setIsCustomInputOpen(false);
                  setCustomInputError('');
                }}
              >
                <SproutText variant="caption" color={colors.muted} style={{ fontWeight: '700' }}>
                  Cancel
                </SproutText>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.customFormSaveBtn, { backgroundColor: colors.accent }]}
                activeOpacity={0.8}
                onPress={handleSaveCustomBudget}
              >
                <Check size={16} color={colors.onAccent} style={{ marginRight: 6 }} />
                <SproutText variant="caption" color={colors.onAccent} style={{ fontWeight: '700' }}>
                  Save Target
                </SproutText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Currency & Splitting */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
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
          <View style={[styles.badgePill, { backgroundColor: colors.background, borderColor: colors.line }]}>
            <SproutText variant="monoSm" color={colors.accent}>
              INR (₹)
            </SproutText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Default Split Method
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Standard allocation
            </SproutText>
          </View>
          <View style={[styles.badgePill, { backgroundColor: colors.background, borderColor: colors.line }]}>
            <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '600' }}>
              Split Equally
            </SproutText>
          </View>
        </View>
      </View>

      {/* Design System & Aesthetics */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeader}>
            <Palette size={18} color={colors.accent} />
            <SproutText variant="subtitle" color={colors.text} weight="700">
              Design & Aesthetics
            </SproutText>
          </View>
          <View style={[styles.badgePill, { backgroundColor: isDefault ? colors.soft : colors.accentSoft, borderColor: 'transparent' }]}>
            <SproutText
              variant="caption"
              color={isDefault ? colors.accent : colors.text}
              style={{ fontWeight: '700', fontSize: 11 }}
            >
              {isDefault ? 'Default (Sprout)' : 'Customized'}
            </SproutText>
          </View>
        </View>

        <SproutText variant="caption" color={colors.muted} style={styles.sectionDesc}>
          Personalize your visual palette and typography. Direction 09 (Sprout) is your default baseline.
        </SproutText>

        {/* Theme Palette Picker Header */}
        <TouchableOpacity
          style={styles.pickerHeaderRow}
          activeOpacity={0.7}
          onPress={() => setIsPalettePickerOpen(!isPalettePickerOpen)}
        >
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Theme Palette
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              {currentPalette.name}
            </SproutText>
          </View>
          <View style={styles.pickerHeaderRight}>
            <View style={styles.colorDotsRow}>
              {currentPalette.dots.map((d, i) => (
                <View key={i} style={[styles.colorDot, { backgroundColor: d }]} />
              ))}
            </View>
            {isPalettePickerOpen ? (
              <ChevronUp size={18} color={colors.muted} />
            ) : (
              <ChevronDown size={18} color={colors.muted} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Palette List */}
        {isPalettePickerOpen && (
          <View style={styles.optionsContainer}>
            {(Object.keys(THEME_PALETTES) as PaletteKey[]).map((key) => {
              const pal = THEME_PALETTES[key];
              const isSelected = paletteId === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? colors.accentSoft : colors.background,
                      borderColor: isSelected ? colors.accent : colors.line,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectPalette(key)}
                >
                  <View style={styles.colorDotsRow}>
                    {pal.dots.map((dotColor, idx) => (
                      <View key={idx} style={[styles.colorDotLarge, { backgroundColor: dotColor }]} />
                    ))}
                  </View>
                  <View style={styles.optionDetails}>
                    <View style={styles.optionTitleRow}>
                      <SproutText variant="body" color={colors.text} weight="700">
                        {pal.name}
                      </SproutText>
                      {key === 'sprout' && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.soft }]}>
                          <SproutText variant="caption" color={colors.accent} style={{ fontSize: 9, fontWeight: '700' }}>
                            DEFAULT
                          </SproutText>
                        </View>
                      )}
                    </View>
                    <SproutText variant="caption" color={colors.muted}>
                      {pal.tagline}
                    </SproutText>
                  </View>
                  {isSelected && <Check size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        {/* Typography Picker Header */}
        <TouchableOpacity
          style={styles.pickerHeaderRow}
          activeOpacity={0.7}
          onPress={() => setIsTypographyPickerOpen(!isTypographyPickerOpen)}
        >
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Typography
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              {currentTypography.name}
            </SproutText>
          </View>
          <View style={styles.pickerHeaderRight}>
            <View style={[styles.badgePill, { backgroundColor: colors.background, borderColor: colors.line }]}>
              <SproutText variant="monoSm" color={colors.accent}>
                {typographyId === 'mono' ? '123 Mono' : typographyId === 'system' ? 'System' : 'Manrope'}
              </SproutText>
            </View>
            {isTypographyPickerOpen ? (
              <ChevronUp size={18} color={colors.muted} />
            ) : (
              <ChevronDown size={18} color={colors.muted} />
            )}
          </View>
        </TouchableOpacity>

        {/* Expanded Typography List */}
        {isTypographyPickerOpen && (
          <View style={styles.optionsContainer}>
            {(Object.keys(TYPOGRAPHY_PRESETS) as TypographyKey[]).map((key) => {
              const typo = TYPOGRAPHY_PRESETS[key];
              const isSelected = typographyId === key;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? colors.accentSoft : colors.background,
                      borderColor: isSelected ? colors.accent : colors.line,
                    },
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectTypography(key)}
                >
                  <View style={styles.optionDetails}>
                    <View style={styles.optionTitleRow}>
                      <SproutText variant="body" color={colors.text} weight="700">
                        {typo.name}
                      </SproutText>
                      {key === 'manrope' && (
                        <View style={[styles.defaultBadge, { backgroundColor: colors.soft }]}>
                          <SproutText variant="caption" color={colors.accent} style={{ fontSize: 9, fontWeight: '700' }}>
                            DEFAULT
                          </SproutText>
                        </View>
                      )}
                    </View>
                    <SproutText variant="caption" color={colors.muted}>
                      {typo.description}
                    </SproutText>
                    <View style={[styles.sampleBox, { backgroundColor: colors.surface, borderColor: colors.line }]}>
                      <SproutText
                        variant="caption"
                        color={colors.text}
                        style={{
                          fontFamily: typo.fontFamilies.regular || undefined,
                          fontWeight: '600',
                        }}
                      >
                        {typo.sample}
                      </SproutText>
                    </View>
                  </View>
                  {isSelected && <Check size={18} color={colors.accent} />}
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        {/* Reset to Default Action */}
        <TouchableOpacity
          style={[
            styles.resetButton,
            {
              backgroundColor: isDefault ? colors.background : colors.accentSoft,
              borderColor: isDefault ? colors.line : colors.accent,
            },
          ]}
          disabled={isDefault}
          activeOpacity={0.8}
          onPress={handleResetToDefault}
        >
          <View style={styles.resetButtonContent}>
            <RotateCcw
              size={18}
              color={isDefault ? colors.muted : colors.accent}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <SproutText
                variant="body"
                color={isDefault ? colors.muted : colors.accent}
                weight="700"
              >
                Reset to Default
              </SproutText>
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 2 }}>
                {isDefault
                  ? 'Currently active: Direction 09 (Sprout) & Manrope standard.'
                  : 'Restores default Direction 09 (Sprout) palette and Manrope typography.'}
              </SproutText>
            </View>
          </View>
          {isDefault && <Check size={16} color={colors.muted} />}
        </TouchableOpacity>
      </View>

      {/* About Section */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
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

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={styles.infoRow}>
          <SproutText variant="body" color={colors.text}>
            Backend Architecture
          </SproutText>
          <SproutText variant="caption" color={colors.muted}>
            FastAPI v1 (Self-Hosted Auth)
          </SproutText>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={[styles.securityRow, { backgroundColor: colors.background }]}>
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
    borderRadius: radii.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  sectionDesc: {
    marginTop: 4,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  activeBudgetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
    marginBottom: spacing.md,
  },
  activeBudgetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  targetIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customEditTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1,
  },
  budgetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.full,
  },
  budgetChipActive: {},
  chipContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipCustomTag: {
    marginLeft: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: radii.xs,
  },
  addCustomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
  },
  chipTextActive: {
    fontWeight: '700',
  },
  customFormContainer: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1.5,
  },
  customFormHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  customInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: 48,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  customTextInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    paddingVertical: 0,
  },
  draftIndicationBox: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  draftBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  draftIndicatorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  quickAdjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: spacing.sm,
  },
  quickAdjustChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.xs,
    borderWidth: 1,
  },
  customFormActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: spacing.md,
  },
  customFormCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  customFormSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pickerHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pickerHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoRowLeft: {
    flex: 1,
  },
  badgePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    borderWidth: 1,
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
  colorDotLarge: {
    width: 18,
    height: 18,
    borderRadius: 9,
  },
  optionsContainer: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    gap: 8,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    gap: 12,
  },
  optionDetails: {
    flex: 1,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  defaultBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.xs,
  },
  sampleBox: {
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    marginTop: spacing.xs,
  },
  resetButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  divider: {
    height: 1,
    marginVertical: spacing.sm,
  },
  securityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
  },
});
