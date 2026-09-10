/**
 * Round a monetary value to 2 decimal places to prevent float precision drift.
 */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100;
}

/**
 * Split an amount equally among N participants, distributing remaining cents
 * so that sum(splits) === total.
 */
export function splitEqual(total: number, count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [roundMoney(total)];

  const totalCents = Math.round(total * 100);
  const baseCents = Math.floor(totalCents / count);
  let remainder = totalCents % count;

  const splits: number[] = [];
  for (let i = 0; i < count; i++) {
    const shareCents = baseCents + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder--;
    splits.push(shareCents / 100);
  }

  return splits;
}
