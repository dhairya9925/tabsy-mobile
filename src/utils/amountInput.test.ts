import { test } from 'node:test';
import assert from 'node:assert';
import {
  cleanAmountInput,
  parseAmountDisplay,
  getAmountResponsiveFontSizes,
} from './amountInput';

test('cleanAmountInput should clean standard integer numbers', () => {
  assert.equal(cleanAmountInput('120'), '120');
  assert.equal(cleanAmountInput('480'), '480');
});

test('cleanAmountInput should strip non-numeric and non-period characters', () => {
  assert.equal(cleanAmountInput('₹480'), '480');
  assert.equal(cleanAmountInput('abc12.5xyz'), '12.5');
});

test('cleanAmountInput should convert initial period to 0.', () => {
  assert.equal(cleanAmountInput('.'), '0.');
  assert.equal(cleanAmountInput('.5'), '0.5');
  assert.equal(cleanAmountInput('.75'), '0.75');
});

test('cleanAmountInput should allow only one period and keep the first dot', () => {
  assert.equal(cleanAmountInput('12.3.4'), '12.34');
  assert.equal(cleanAmountInput('10..5'), '10.5');
});

test('cleanAmountInput should limit decimal places to 2', () => {
  assert.equal(cleanAmountInput('12.345'), '12.34');
  assert.equal(cleanAmountInput('99.9999'), '99.99');
});

test('cleanAmountInput should normalize multiple leading zeroes', () => {
  assert.equal(cleanAmountInput('00'), '0');
  assert.equal(cleanAmountInput('05'), '5');
  assert.equal(cleanAmountInput('007'), '7');
  assert.equal(cleanAmountInput('0.5'), '0.5');
  assert.equal(cleanAmountInput('0.05'), '0.05');
});

test('cleanAmountInput should limit integer length to 7 digits', () => {
  assert.equal(cleanAmountInput('12345678'), '1234567');
  assert.equal(cleanAmountInput('12345678.99'), '1234567.99');
});

test('parseAmountDisplay should return full placeholder when value is empty', () => {
  const res = parseAmountDisplay('', '480');
  assert.equal(res.displayInt, '480');
  assert.equal(res.isIntPlaceholder, true);
  assert.equal(res.displayDecimalActive, '');
  assert.equal(res.displayDecimalPlaceholder, '.00');
  assert.equal(res.hasDecimal, false);
  assert.equal(res.cursorPlacement, 'start');
});

test('parseAmountDisplay should return active integer with ghost .00 when typing integer', () => {
  const res = parseAmountDisplay('120', '480');
  assert.equal(res.displayInt, '120');
  assert.equal(res.isIntPlaceholder, false);
  assert.equal(res.displayDecimalActive, '');
  assert.equal(res.displayDecimalPlaceholder, '.00');
  assert.equal(res.hasDecimal, false);
  assert.equal(res.cursorPlacement, 'integer');
});

test('parseAmountDisplay should return active dot with ghost 00 when user typed decimal point', () => {
  const res = parseAmountDisplay('120.', '480');
  assert.equal(res.displayInt, '120');
  assert.equal(res.isIntPlaceholder, false);
  assert.equal(res.displayDecimalActive, '.');
  assert.equal(res.displayDecimalPlaceholder, '00');
  assert.equal(res.hasDecimal, true);
  assert.equal(res.cursorPlacement, 'decimal');
});

test('parseAmountDisplay should return active .5 with ghost 0 when user typed 1 decimal digit', () => {
  const res = parseAmountDisplay('120.5', '480');
  assert.equal(res.displayInt, '120');
  assert.equal(res.isIntPlaceholder, false);
  assert.equal(res.displayDecimalActive, '.5');
  assert.equal(res.displayDecimalPlaceholder, '0');
  assert.equal(res.hasDecimal, true);
  assert.equal(res.cursorPlacement, 'decimal');
});

test('parseAmountDisplay should return active .50 with no ghost when user typed 2 decimal digits', () => {
  const res = parseAmountDisplay('120.50', '480');
  assert.equal(res.displayInt, '120');
  assert.equal(res.isIntPlaceholder, false);
  assert.equal(res.displayDecimalActive, '.50');
  assert.equal(res.displayDecimalPlaceholder, '');
  assert.equal(res.hasDecimal, true);
  assert.equal(res.cursorPlacement, 'decimal');
});

test('parseAmountDisplay should handle leading decimal point value like 0.25', () => {
  const res = parseAmountDisplay('0.25', '480');
  assert.equal(res.displayInt, '0');
  assert.equal(res.isIntPlaceholder, false);
  assert.equal(res.displayDecimalActive, '.25');
  assert.equal(res.displayDecimalPlaceholder, '');
  assert.equal(res.hasDecimal, true);
  assert.equal(res.cursorPlacement, 'decimal');
});

test('getAmountResponsiveFontSizes should return large font sizes for standard amounts', () => {
  const res = getAmountResponsiveFontSizes(3);
  assert.equal(res.intFontSize, 52);
  assert.equal(res.decFontSize, 22);
  assert.equal(res.currFontSize, 28);
});

test('getAmountResponsiveFontSizes should scale down slightly for 6-digit amounts', () => {
  const res = getAmountResponsiveFontSizes(6);
  assert.equal(res.intFontSize, 42);
  assert.equal(res.decFontSize, 20);
});

test('getAmountResponsiveFontSizes should scale down further for 8-digit amounts', () => {
  const res = getAmountResponsiveFontSizes(8);
  assert.equal(res.intFontSize, 34);
  assert.equal(res.decFontSize, 18);
});
