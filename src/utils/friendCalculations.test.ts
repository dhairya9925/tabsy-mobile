import { test } from 'node:test';
import assert from 'node:assert';
import { roundMoney } from './money';

export function calculate1on1Split(
  amount: number,
  paidBy: 'me' | 'them',
  splitType: 'equal' | 'full'
) {
  const rounded = roundMoney(amount);
  if (splitType === 'equal') {
    const half = roundMoney(rounded / 2);
    return {
      myShare: half,
      theirShare: roundMoney(rounded - half),
      netEffect: paidBy === 'me' ? half : -half, // positive = they owe me, negative = I owe them
    };
  } else {
    return {
      myShare: paidBy === 'me' ? 0 : rounded,
      theirShare: paidBy === 'me' ? rounded : 0,
      netEffect: paidBy === 'me' ? rounded : -rounded,
    };
  }
}

export function resolveSettlementPayer(
  currentUserId: string,
  friendId: string,
  netBalance: number
) {
  // If netBalance < 0, current user owes friend -> current user pays friend
  // If netBalance > 0, friend owes current user -> friend pays current user
  if (netBalance < 0) {
    return {
      payerId: currentUserId,
      payeeId: friendId,
      payerIsCurrentUser: true,
    };
  }
  return {
    payerId: friendId,
    payeeId: currentUserId,
    payerIsCurrentUser: false,
  };
}

test('calculate1on1Split equal split paid by me', () => {
  const result = calculate1on1Split(100, 'me', 'equal');
  assert.strictEqual(result.myShare, 50);
  assert.strictEqual(result.theirShare, 50);
  assert.strictEqual(result.netEffect, 50);
});

test('calculate1on1Split equal split paid by them with cents', () => {
  const result = calculate1on1Split(99.99, 'them', 'equal');
  assert.strictEqual(result.myShare, 50);
  assert.strictEqual(result.theirShare, 49.99);
  assert.strictEqual(result.netEffect, -50);
});

test('calculate1on1Split full split paid by me (they owe full)', () => {
  const result = calculate1on1Split(250, 'me', 'full');
  assert.strictEqual(result.myShare, 0);
  assert.strictEqual(result.theirShare, 250);
  assert.strictEqual(result.netEffect, 250);
});

test('calculate1on1Split full split paid by them (I owe full)', () => {
  const result = calculate1on1Split(150, 'them', 'full');
  assert.strictEqual(result.myShare, 150);
  assert.strictEqual(result.theirShare, 0);
  assert.strictEqual(result.netEffect, -150);
});

test('resolveSettlementPayer when current user owes friend', () => {
  const res = resolveSettlementPayer('user-1', 'friend-2', -350);
  assert.strictEqual(res.payerId, 'user-1');
  assert.strictEqual(res.payeeId, 'friend-2');
  assert.strictEqual(res.payerIsCurrentUser, true);
});

test('resolveSettlementPayer when friend owes current user', () => {
  const res = resolveSettlementPayer('user-1', 'friend-2', 720);
  assert.strictEqual(res.payerId, 'friend-2');
  assert.strictEqual(res.payeeId, 'user-1');
  assert.strictEqual(res.payerIsCurrentUser, false);
});
