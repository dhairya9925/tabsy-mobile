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
  Plus,
  X,
} from 'lucide-react-native';

const GENERIC_BUDGET_OPTIONS = [10000, 15000, 20000, 30000];

export const SettingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const monthlyBudget = useBudgetStore((s) => s.monthlyBudget);
  const customBudgets = useBudgetStore((s) => s.customBudgets);
  const setMonthlyBudget = useBudgetStore((s) => s.setMonthlyBudget);
  const addCustomBudget = useBudgetStore((s) => s.addCustomBudget);

  const paletteId = useThemeStore((s) => s.paletteId);
  const typographyId = useThemeStore((s) => s.typographyId);
  const isDefault = useThemeStore((s) => s.isDefault);
  const isDark = useThemeStore((s) => s.isDark);
  const setPalette = useThemeStore((s) => s.setPalette);
  const setTypography = useThemeStore((s) => s.setTypography);
  const resetToDefault = useThemeStore((s) => s.resetToDefault);

  // Contextual capsule badge colors (dark forest on light background; elevated surface on dark background)
  const capsuleBg = isDark ? colors.surfaceElevated : colors.text;
  const capsuleText = isDark ? colors.accent : colors.soft;

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
    setTimeout(() => setJustSavedTarget(false), 2500);
    setToastMessage(`Monthly rhythm set to ${formatCurrency(amount)}`);
  };

  const handleOpenCustomInput = () => {
    setIsCustomInputOpen(true);
    setCustomInputText(monthlyBudget ? String(monthlyBudget) : '');
    setCustomInputError('');
  };

  const handleSaveCustomBudget = () => {
    const parsed = parseInt(customInputText, 10);
    if (isNaN(parsed) || parsed < 1000) {
      setCustomInputError('Please enter a target of at least ₹1,000');
      return;
    }
    if (parsed > 10000000) {
      setCustomInputError('Target exceeds limit of ₹1,00,00,000');
      return;
    }

    addCustomBudget(parsed);
    setIsCustomInputOpen(false);
    setCustomInputText('');
    setCustomInputError('');
    setJustSavedTarget(true);
    setTimeout(() => setJustSavedTarget(false), 3000);
    setToastMessage(`Monthly rhythm saved to ${formatCurrency(parsed)}`);
  };

  const handleAdjustCustomDraft = (delta: number) => {
    const current = parseInt(customInputText, 10) || monthlyBudget || 30000;
    const updated = Math.max(1000, current + delta);
    setCustomInputText(String(updated));
    setCustomInputError('');
  };

  const handleSelectPalette = (key: PaletteKey) => {
    setPalette(key);
    setToastMessage(`Palette set to ${THEME_PALETTES[key].name}`);
  };

  const handleSelectTypography = (key: TypographyKey) => {
    setTypography(key);
    setToastMessage(`Typography set to ${TYPOGRAPHY_PRESETS[key].name}`);
  };

  const handleResetToDefault = () => {
    resetToDefault();
    setToastMessage('Appearance reset to Sprout default');
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
          <SproutText variant="eyebrow" color={colors.muted}>
            PREFERENCES
          </SproutText>
          <SproutText variant="title" color={colors.text} weight="800">
            Settings
          </SproutText>
        </View>
        <View style={{ width: 44 }} />
      </View>

      {/* 1. Monthly Rhythm */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeader}>
            <View style={[styles.headerIconCircle, { backgroundColor: colors.background }]}>
              <Target size={16} color={colors.accent} />
            </View>
            <SproutText variant="subtitle" color={colors.text} weight="700">
              Monthly Rhythm
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <Check size={11} color={capsuleText} strokeWidth={2.4} style={{ marginRight: 4 }} />
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              {justSavedTarget ? 'Saved' : 'Active'}
            </SproutText>
          </View>
        </View>

        <SproutText variant="caption" color={colors.muted} style={styles.sectionDesc}>
          Paces your daily spending against your monthly target on the Home ring.
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
            <View style={[styles.targetIconCircle, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }]}>
              <Target size={18} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <SproutText variant="eyebrow" color={colors.muted}>
                MONTHLY TARGET
              </SproutText>
              <View style={styles.amountBaselineRow}>
                <SproutText variant="amount" color={colors.text} weight="800" style={{ fontSize: 22 }}>
                  {formatCurrency(monthlyBudget)}
                </SproutText>
                <SproutText variant="caption" color={colors.muted} style={{ marginLeft: 4 }}>
                  / month
                </SproutText>
              </View>
              <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
                Paced at ~{formatCurrency(Math.round(monthlyBudget / 30))} / day
              </SproutText>
            </View>
          </View>
        </View>

        {/* Preset & Custom Budget Chips */}
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
                    <Check size={11} color={colors.onAccent} style={{ marginRight: 4 }} />
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
                        {
                          backgroundColor: isSelected
                            ? 'rgba(255,255,255,0.25)'
                            : capsuleBg,
                        },
                      ]}
                    >
                      <SproutText
                        variant="caption"
                        color={isSelected ? colors.onAccent : capsuleText}
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
            onPress={() => {
              if (isCustomInputOpen) {
                setIsCustomInputOpen(false);
              } else {
                handleOpenCustomInput();
              }
            }}
          >
            <Plus size={12} color={colors.accent} style={{ marginRight: 4 }} />
            <SproutText variant="caption" color={colors.accent} style={{ fontWeight: '700' }}>
              Custom
            </SproutText>
          </TouchableOpacity>
        </View>

        {/* Expandable Custom Budget Input Form */}
        {isCustomInputOpen && (
          <View style={[styles.customFormContainer, { backgroundColor: colors.background, borderColor: colors.accent }]}>
            <View style={styles.customFormHeader}>
              <View>
                <SproutText variant="body" color={colors.text} weight="700">
                  Custom Rhythm Target
                </SproutText>
                <SproutText variant="caption" color={colors.muted}>
                  Set any monthly spending pace in INR (₹)
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
            <View style={[styles.customInputRow, { backgroundColor: colors.surfaceElevated, borderColor: customInputError ? colors.negative : colors.line }]}>
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

            {/* Live Indication: Draft Preview */}
            {!!customInputText && parseInt(customInputText, 10) > 0 && (
              <View style={[styles.draftIndicationBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }]}>
                <View style={styles.draftBadgeRow}>
                  <View style={[styles.draftIndicatorDot, { backgroundColor: colors.sun }]} />
                  <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, fontWeight: '700' }}>
                    TARGET PREVIEW
                  </SproutText>
                </View>
                <SproutText variant="body" color={colors.text} weight="700" style={{ marginTop: 2 }}>
                  {formatCurrency(parseInt(customInputText, 10))} / month
                </SproutText>
                <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
                  Daily pace: ~{formatCurrency(Math.round(parseInt(customInputText, 10) / 30))} / day
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
                Quick:
              </SproutText>
              {[-5000, 5000, 10000, 25000].map((delta) => (
                <TouchableOpacity
                  key={delta}
                  style={[styles.quickAdjustChip, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }]}
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
                <Check size={15} color={colors.onAccent} style={{ marginRight: 5 }} />
                <SproutText variant="caption" color={colors.onAccent} style={{ fontWeight: '700' }}>
                  Save Target
                </SproutText>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* 2. Splitting & Units */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.headerIconCircle, { backgroundColor: colors.background }]}>
            <Coins size={16} color={colors.accent} />
          </View>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            Splitting & Units
          </SproutText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Currency
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Indian Rupee
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              INR (₹)
            </SproutText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Default Split
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Equally shared (1/n)
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              Equal share
            </SproutText>
          </View>
        </View>
      </View>

      {/* 3. Appearance */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeaderBetween}>
          <View style={styles.sectionHeader}>
            <View style={[styles.headerIconCircle, { backgroundColor: colors.background }]}>
              <Palette size={16} color={colors.accent} />
            </View>
            <SproutText variant="subtitle" color={colors.text} weight="700">
              Appearance
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              {isDefault ? 'Sprout' : 'Custom'}
            </SproutText>
          </View>
        </View>

        <SproutText variant="caption" color={colors.muted} style={styles.sectionDesc}>
          Curated visual palettes and typographic voice.
        </SproutText>

        {/* Theme Palette Picker Header */}
        <TouchableOpacity
          style={styles.pickerHeaderRow}
          activeOpacity={0.7}
          onPress={() => setIsPalettePickerOpen(!isPalettePickerOpen)}
        >
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Palette
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
                        <View style={[styles.defaultBadge, { backgroundColor: capsuleBg }]}>
                          <SproutText style={[styles.defaultBadgeText, { color: capsuleText }]}>
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
            <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
              <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
                {currentTypography.name}
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
                        <View style={[styles.defaultBadge, { backgroundColor: capsuleBg }]}>
                          <SproutText style={[styles.defaultBadgeText, { color: capsuleText }]}>
                            DEFAULT
                          </SproutText>
                        </View>
                      )}
                    </View>
                    <SproutText variant="caption" color={colors.muted}>
                      {typo.description}
                    </SproutText>
                    <View style={[styles.sampleBox, { backgroundColor: colors.surfaceElevated, borderColor: colors.line }]}>
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

        {/* Reset Action */}
        {!isDefault ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.line }]} />
            <TouchableOpacity
              style={[
                styles.resetButton,
                {
                  backgroundColor: colors.accentSoft,
                  borderColor: colors.accent,
                },
              ]}
              activeOpacity={0.8}
              onPress={handleResetToDefault}
            >
              <View style={styles.resetButtonContent}>
                <RotateCcw
                  size={16}
                  color={colors.accent}
                  style={{ marginRight: 10 }}
                />
                <View style={{ flex: 1 }}>
                  <SproutText
                    variant="body"
                    color={colors.accent}
                    weight="700"
                  >
                    Restore Sprout default
                  </SproutText>
                  <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11, marginTop: 1 }}>
                    Revert to Sprout botanical palette and Manrope typography
                  </SproutText>
                </View>
              </View>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.defaultActiveNoteRow}>
            <Check size={13} color={colors.muted} style={{ marginRight: 6 }} />
            <SproutText variant="caption" color={colors.muted} style={{ fontSize: 11 }}>
              Default Sprout palette & Manrope active
            </SproutText>
          </View>
        )}
      </View>

      {/* 4. About Tabsy */}
      <View style={[styles.sectionCard, shadows.card, { backgroundColor: colors.surface, borderColor: colors.line }]}>
        <View style={styles.sectionHeader}>
          <View style={[styles.headerIconCircle, { backgroundColor: colors.background }]}>
            <Info size={16} color={colors.accent} />
          </View>
          <SproutText variant="subtitle" color={colors.text} weight="700">
            About Tabsy
          </SproutText>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Version
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Tabsy Mobile
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              1.0.0
            </SproutText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={styles.infoRow}>
          <View style={styles.infoRowLeft}>
            <SproutText variant="body" color={colors.text} weight="600">
              Sync Engine
            </SproutText>
            <SproutText variant="caption" color={colors.muted}>
              Tabsy Cloud API
            </SproutText>
          </View>
          <View style={[styles.capsuleBadge, { backgroundColor: capsuleBg }]}>
            <Check size={11} color={capsuleText} strokeWidth={2.4} style={{ marginRight: 4 }} />
            <SproutText style={[styles.capsuleBadgeText, { color: capsuleText }]}>
              Connected
            </SproutText>
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: colors.line }]} />

        <View style={[styles.securityRow, { backgroundColor: colors.background }]}>
          <ShieldCheck size={16} color={colors.accent} />
          <SproutText variant="caption" color={colors.muted} style={{ flex: 1, lineHeight: 17 }}>
            End-to-end device token encryption with secure vault storage.
          </SproutText>
        </View>
      </View>
    </ScreenShell>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingBottom: 80,
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
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderWidth: 1.2,
    marginBottom: spacing.md,
  },
  activeBudgetBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  targetIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountBaselineRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 1,
  },
  budgetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  budgetChip: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.full,
  },
  budgetChipActive: {},
  chipContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  chipCustomTag: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radii.full,
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
    borderWidth: 1.2,
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
    height: 46,
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
  capsuleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderRadius: radii.full,
  },
  capsuleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  defaultBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: radii.full,
  },
  defaultBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.4,
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
    paddingRight: 8,
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
  defaultActiveNoteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.sm,
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
