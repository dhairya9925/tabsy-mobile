import { GroupBalance, GroupExpense } from '../types';
import { formatCurrencyExact } from './formatters';

/**
 * Computes an itemized breakdown explaining how a balance row is derived
 * from the group's expenses and splits.
 *
 * Example:
 * "Vikram owes you ₹2,217.33 based on: Hotel (his share ₹5,000.67) + Dinner (₹217.33) – Music Concert (your share ₹1,500.00)"
 */
export function computeBalanceBreakdown(
  b: GroupBalance,
  expenses: GroupExpense[] = [],
  currentUserId?: string
): {
  headline: string;
  explanation: string;
  debts: Array<{ title: string; shareLabel: string; amount: number }>;
  credits: Array<{ title: string; shareLabel: string; amount: number }>;
  isSimplified: boolean;
} {
  const iAmRecipient = currentUserId === b.to_user_id;
  const iAmPayer = currentUserId === b.from_user_id;

  const headline = iAmPayer
    ? `You owe ${b.to_name} ${formatCurrencyExact(b.amount)}`
    : iAmRecipient
    ? `${b.from_name} owes you ${formatCurrencyExact(b.amount)}`
    : `${b.from_name} owes ${b.to_name} ${formatCurrencyExact(b.amount)}`;

  const debts: Array<{ title: string; shareLabel: string; amount: number }> = [];
  const credits: Array<{ title: string; shareLabel: string; amount: number }> = [];

  expenses.forEach((exp) => {
    const payerId = exp.paid_by || exp.user_id;
    const title = exp.note?.trim() || exp.category || 'Expense';

    (exp.splits || []).forEach((split) => {
      if (split.is_settled) return;

      // Expense paid by recipient, split belongs to payer (debt: payer owes recipient)
      if (payerId === b.to_user_id && split.user_id === b.from_user_id) {
        const shareLabel = iAmPayer
          ? 'your share'
          : iAmRecipient
          ? 'his share'
          : `${b.from_name}'s share`;
        debts.push({ title, shareLabel, amount: split.amount });
      }

      // Expense paid by payer, split belongs to recipient (counter offset / credit)
      if (payerId === b.from_user_id && split.user_id === b.to_user_id) {
        const shareLabel = iAmRecipient
          ? 'your share'
          : iAmPayer
          ? `${b.to_name}'s share`
          : `${b.to_name}'s share`;
        credits.push({ title, shareLabel, amount: split.amount });
      }
    });
  });

  if (debts.length > 0 || credits.length > 0) {
    const debtParts = debts.map((d, i) =>
      i === 0
        ? `${d.title} (${d.shareLabel} ${formatCurrencyExact(d.amount)})`
        : `${d.title} (${formatCurrencyExact(d.amount)})`
    );
    const creditParts = credits.map((c, i) =>
      i === 0
        ? `${c.title} (${c.shareLabel} ${formatCurrencyExact(c.amount)})`
        : `${c.title} (${formatCurrencyExact(c.amount)})`
    );

    let partsStr = debtParts.join(' + ');
    if (creditParts.length > 0) {
      partsStr = (partsStr ? `${partsStr} – ` : '– ') + creditParts.join(' – ');
    }

    const explanation = `${headline} based on: ${partsStr}`;
    return {
      headline,
      explanation,
      debts,
      credits,
      isSimplified: false,
    };
  }

  // Multi-party debt simplification fallback
  const involvedExpenses: string[] = [];
  expenses.forEach((exp) => {
    const hasPayerSplit = exp.splits?.some((s) => s.user_id === b.from_user_id && !s.is_settled);
    if (hasPayerSplit) {
      involvedExpenses.push(exp.note?.trim() || exp.category);
    }
  });

  const uniqueInvolved = Array.from(new Set(involvedExpenses)).slice(0, 3);
  const expListStr = uniqueInvolved.length > 0 ? ` (${uniqueInvolved.join(', ')})` : '';

  const explanation = `${headline} based on: Multi-party group debt simplification across shared expenses${expListStr}.`;
  return {
    headline,
    explanation,
    debts: [],
    credits: [],
    isSimplified: true,
  };
}
