import { test } from 'node:test';
import assert from 'node:assert';
import { roundMoney, splitEqual } from './money';

test('roundMoney should round correctly to 2 decimal places', () => {
  assert.strictEqual(roundMoney(10.555), 10.56);
  assert.strictEqual(roundMoney(10.554), 10.55);
  assert.strictEqual(roundMoney(0), 0);
});

test('splitEqual should distribute amounts evenly and balance cents exactly', () => {
  // ₹100 split 3 ways: 33.34, 33.33, 33.33 -> sum = 100.00
  const splits3 = splitEqual(100, 3);
  assert.strictEqual(splits3.length, 3);
  assert.strictEqual(splits3[0], 33.34);
  assert.strictEqual(splits3[1], 33.33);
  assert.strictEqual(splits3[2], 33.33);
  const sum3 = splits3.reduce((a, b) => a + b, 0);
  assert.strictEqual(roundMoney(sum3), 100);

  // ₹1,200 split 4 ways: 300, 300, 300, 300
  const splits4 = splitEqual(1200, 4);
  assert.deepStrictEqual(splits4, [300, 300, 300, 300]);

  // ₹10 split 1 way
  assert.deepStrictEqual(splitEqual(10, 1), [10]);

  // ₹0 or 0 count
  assert.deepStrictEqual(splitEqual(10, 0), []);
});
