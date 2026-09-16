/**
 * Utility functions for amount input sanitization, parsing, and responsive typography
 * for Sprout expense and journal screens.
 */

export interface AmountDisplayParts {
  displayInt: string;
  isIntPlaceholder: boolean;
  displayDecimalActive: string;
  displayDecimalPlaceholder: string;
  hasDecimal: boolean;
  cursorPlacement: 'start' | 'integer' | 'decimal';
}

/**
 * Sanitizes user input from decimal keypad:
 * - Allows only digits and one optional decimal point
 * - Converts an initial '.' into '0.'
 * - Removes superfluous leading zeroes (e.g. '05' -> '5', but keeps '0.' and '0.5')
 * - Restricts integer portion to at most 7 digits (up to 99,99,999)
 * - Restricts decimal portion to at most 2 digits
 */
export function cleanAmountInput(text: string): string {
  let cleaned = text.replace(/[^0-9.]/g, '');

  if (cleaned.startsWith('.')) {
    cleaned = '0' + cleaned;
  }

  const parts = cleaned.split('.');
  if (parts.length > 2) {
    // If multiple dots, keep only the first dot and discard subsequent dots
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }

  const normalizedParts = cleaned.split('.');
  let integerPart = normalizedParts[0] || '';
  let decimalPart = normalizedParts[1];

  // Limit integer portion to 7 digits
  if (integerPart.length > 7) {
    integerPart = integerPart.slice(0, 7);
  }

  // Strip leading zeroes unless the value is just '0'
  if (integerPart.length > 1 && integerPart.startsWith('0')) {
    integerPart = integerPart.replace(/^0+/, '') || '0';
  }

  // Limit decimal portion to 2 digits
  if (decimalPart !== undefined && decimalPart.length > 2) {
    decimalPart = decimalPart.slice(0, 2);
  }

  if (decimalPart !== undefined) {
    return `${integerPart}.${decimalPart}`;
  }

  return integerPart;
}

/**
 * Parses the raw amount string into integer and fractional display tokens,
 * distinguishing active typed digits from ghost placeholder slots.
 */
export function parseAmountDisplay(
  value: string,
  placeholder: string = '480'
): AmountDisplayParts {
  const hasDecimal = value.includes('.');

  // Empty state: render full placeholder
  if (!value || value.trim() === '') {
    return {
      displayInt: placeholder,
      isIntPlaceholder: true,
      displayDecimalActive: '',
      displayDecimalPlaceholder: '.00',
      hasDecimal: false,
      cursorPlacement: 'start',
    };
  }

  const [rawInt = '', rawDec = ''] = value.split('.');
  const displayInt = rawInt === '' && hasDecimal ? '0' : rawInt || placeholder;
  const isIntPlaceholder = rawInt === '' && !hasDecimal;

  if (!hasDecimal) {
    return {
      displayInt,
      isIntPlaceholder,
      displayDecimalActive: '',
      displayDecimalPlaceholder: '.00',
      hasDecimal: false,
      cursorPlacement: 'integer',
    };
  }

  // User has typed the decimal separator '.'
  const displayDecimalActive = `.${rawDec}`;
  let displayDecimalPlaceholder = '';

  if (rawDec.length === 0) {
    // Typed '.', ghost slots for 2 decimal places: '00'
    displayDecimalPlaceholder = '00';
  } else if (rawDec.length === 1) {
    // Typed '.5', ghost slot for second decimal place: '0'
    displayDecimalPlaceholder = '0';
  }

  return {
    displayInt,
    isIntPlaceholder: false,
    displayDecimalActive,
    displayDecimalPlaceholder,
    hasDecimal: true,
    cursorPlacement: 'decimal',
  };
}

/**
 * Responsive font sizing tokens based on integer character length to prevent
 * clipping or line-wrapping on compact mobile screens.
 */
export function getAmountResponsiveFontSizes(intLength: number) {
  if (intLength >= 8) {
    return {
      intFontSize: 34,
      decFontSize: 18,
      currFontSize: 20,
      decMarginBottom: 4,
      currMarginBottom: 4,
      intLetterSpacing: -0.5,
    };
  }
  if (intLength >= 6) {
    return {
      intFontSize: 42,
      decFontSize: 20,
      currFontSize: 24,
      decMarginBottom: 5,
      currMarginBottom: 5,
      intLetterSpacing: -1,
    };
  }
  return {
    intFontSize: 52,
    decFontSize: 22,
    currFontSize: 28,
    decMarginBottom: 6,
    currMarginBottom: 6,
    intLetterSpacing: -1.5,
  };
}
