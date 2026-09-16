import React, { forwardRef, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ReturnKeyTypeOptions,
  Platform,
} from 'react-native';
import { SproutText } from './SproutText';
import { colors, spacing, shadows, fontFamilies } from '../theme';
import {
  cleanAmountInput,
  parseAmountDisplay,
  getAmountResponsiveFontSizes,
} from '../utils/amountInput';

export interface SproutAmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  inputRef?: React.RefObject<TextInput | null> | React.MutableRefObject<TextInput | null>;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  returnKeyType?: ReturnKeyTypeOptions;
  onSubmitEditing?: () => void;
}

/**
 * SproutAmountInput: Clean, un-clipped financial amount input card.
 *
 * Uses native React Native inline <Text> nesting so that:
 * 1. Integer (52px) and decimal (22px) share the exact same typographic baseline.
 * 2. Ascenders/descenders are never chopped (unconstrained line height).
 * 3. Values typed after the decimal point stay rendered in the smaller font size.
 * 4. Tap-anywhere card focuses the native keyboard with 0 visual glitching.
 */
export const SproutAmountInput = forwardRef<TextInput, SproutAmountInputProps>(
  (
    {
      value,
      onChangeText,
      inputRef: externalRef,
      placeholder = '480',
      label = 'How much?',
      autoFocus = false,
      style,
      testID = 'sprout-amount-input',
      returnKeyType = 'done',
      onSubmitEditing,
    },
    forwardedRef
  ) => {
    const internalRef = useRef<TextInput>(null);
    const resolvedRef =
      (forwardedRef as React.MutableRefObject<TextInput | null>) ||
      (externalRef as React.MutableRefObject<TextInput | null>) ||
      internalRef;

    const handleTextChange = (text: string) => {
      const cleaned = cleanAmountInput(text);
      onChangeText(cleaned);
    };

    const handlePressCard = () => {
      resolvedRef.current?.focus();
    };

    const parts = parseAmountDisplay(value, placeholder);
    const {
      intFontSize,
      decFontSize,
      currFontSize,
      intLetterSpacing,
    } = getAmountResponsiveFontSizes(parts.displayInt.length);

    return (
      <Pressable
        onPress={handlePressCard}
        style={[styles.sproutAmountCard, style]}
        accessible={true}
        accessibilityRole="adjustable"
        accessibilityLabel={`${label} ₹${parts.displayInt}${parts.displayDecimalActive || parts.displayDecimalPlaceholder}`}
      >
        {/* Invisible native input capturing keystrokes */}
        <TextInput
          ref={resolvedRef}
          value={value}
          onChangeText={handleTextChange}
          keyboardType="decimal-pad"
          maxLength={11}
          style={styles.invisibleInput}
          autoFocus={autoFocus}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          testID={testID}
          caretHidden={true}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
        />

        {/* Section eyebrow label */}
        {label ? (
          <SproutText variant="caption" color={colors.muted} style={styles.howMuchLabel}>
            {label}
          </SproutText>
        ) : null}

        {/* Single unconstrained inline Text container:
            Natively aligns ₹, integer, and decimal on the same typographic baseline without clipping */}
        <View pointerEvents="none" style={styles.amountDisplayRow}>
          <Text style={styles.amountMainText}>
            <Text
              style={[
                styles.currencySymbol,
                {
                  fontSize: currFontSize,
                },
              ]}
            >
              ₹{' '}
            </Text>
            <Text
              style={[
                styles.integerText,
                {
                  fontSize: intFontSize,
                  letterSpacing: intLetterSpacing,
                  color: parts.isIntPlaceholder ? colors.line : colors.text,
                },
              ]}
            >
              {parts.displayInt}
            </Text>
            {parts.displayDecimalActive ? (
              <Text
                style={[
                  styles.decimalText,
                  {
                    fontSize: decFontSize,
                    color: colors.text,
                  },
                ]}
              >
                {parts.displayDecimalActive}
              </Text>
            ) : null}
            {parts.displayDecimalPlaceholder ? (
              <Text
                style={[
                  styles.decimalText,
                  {
                    fontSize: decFontSize,
                    color: colors.line,
                  },
                ]}
              >
                {parts.displayDecimalPlaceholder}
              </Text>
            ) : null}
          </Text>
        </View>
      </Pressable>
    );
  }
);

SproutAmountInput.displayName = 'SproutAmountInput';

const styles = StyleSheet.create({
  sproutAmountCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: 2,
    ...shadows.card,
    position: 'relative',
  },
  howMuchLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  amountDisplayRow: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 0,
  },
  amountMainText: {
    textAlign: 'center',
  },
  currencySymbol: {
    fontFamily: fontFamilies.bold,
    color: colors.text,
  },
  integerText: {
    fontFamily: fontFamilies.bold,
  },
  decimalText: {
    fontFamily: fontFamilies.bold,
    letterSpacing: -0.5,
  },
  invisibleInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.01,
    color: 'transparent',
    backgroundColor: 'transparent',
    zIndex: 1,
    ...(Platform.OS === 'android' ? { textDecorationColor: 'transparent' } : {}),
  },
});
