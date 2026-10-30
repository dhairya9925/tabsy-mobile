import { GroupBalance, GroupExpense } from '../types';
import { formatCurrencyExact, formatDate } from './formatters';

export interface BreakdownItem {
  expenseId: string;
  title: string;
  shareLabel: string;
  amount: number;
  date?: string;
  category?: string;
}

export interface BalanceBreakdownResult {
  headline: string;
  explanation: string;
  debts: BreakdownItem[];
  credits: BreakdownItem[];
  totalDebt: number;
  totalCredit: number;
  netAmount: number;
  debtSectionTitle: string;
  creditSectionTitle: string;
  isSimplified: boolean;
  involvedExpenses: string[];
}

/**
 * Computes an itemized breakdown explaining how a balance row is derived
 * from the group's expenses and splits.
 *
 * Provides both structured itemized collections (for rich receipt display)
 * and human-readable explanation strings.
 */
export function computeBalanceBreakdown(
  b: GroupBalance,
  expenses: GroupExpense[] = [],
  currentUserId?: string
): BalanceBreakdownResult {
  const iAmRecipient = currentUserId === b.to_user_id;
  const iAmPayer = currentUserId === b.from_user_id;

  const headline = iAmPayer
    ? `You owe ${b.to_name} ${formatCurrencyExact(b.amount)}`
    : iAmRecipient
    ? `${b.from_name} owes you ${formatCurrencyExact(b.amount)}`
    : `${b.from_name} owes ${b.to_name} ${formatCurrencyExact(b.amount)}`;

  const debtSectionTitle = iAmPayer
    ? `What you owe ${b.to_name}`
    : iAmRecipient
    ? `What ${b.from_name} owes you`
    : `What ${b.from_name} owes ${b.to_name}`;

  const creditSectionTitle = iAmRecipient
    ? `Offsets you owe ${b.from_name}`
    : iAmPayer
    ? `Offsets ${b.to_name} owes you`
    : `Offsets ${b.to_name} owes ${b.from_name}`;

  const debts: BreakdownItem[] = [];
  const credits: BreakdownItem[] = [];

  expenses.forEach((exp) => {
    const payerId = exp.paid_by || exp.user_id;
    const title = exp.note?.trim() || exp.category || 'Expense';
    const date = exp.expense_date ? formatDate(exp.expense_date) : undefined;

    (exp.splits || []).forEach((split) => {
      if (split.is_settled) return;

      // Expense paid by recipient, split belongs to payer (debt: payer owes recipient)
      if (payerId === b.to_user_id && split.user_id === b.from_user_id) {
        const shareLabel = iAmPayer
          ? 'your share'
          : iAmRecipient
          ? 'his share'
          : `${b.from_name}'s share`;
        debts.push({
          expenseId: exp.id,
          title,
          shareLabel,
          amount: split.amount,
          date,
          category: exp.category,
        });
      }

      // Expense paid by payer, split belongs to recipient (counter offset / credit)
      if (payerId === b.from_user_id && split.user_id === b.to_user_id) {
        const shareLabel = iAmRecipient
          ? 'your share'
          : iAmPayer
          ? `${b.to_name}'s share`
          : `${b.to_name}'s share`;
        credits.push({
          expenseId: exp.id,
          title,
          shareLabel,
          amount: split.amount,
          date,
          category: exp.category,
        });
      }
    });
  });

  const totalDebt = debts.reduce((acc, d) => acc + d.amount, 0);
  const totalCredit = credits.reduce((acc, c) => acc + c.amount, 0);

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
      totalDebt,
      totalCredit,
      netAmount: b.amount,
      debtSectionTitle,
      creditSectionTitle,
      isSimplified: false,
      involvedExpenses: [],
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

  const uniqueInvolved = Array.from(new Set(involvedExpenses)).slice(0, 4);
  const expListStr = uniqueInvolved.length > 0 ? ` (${uniqueInvolved.join(', ')})` : '';

  const explanation = `${headline} based on: Multi-party group debt simplification across shared expenses${expListStr}.`;
  return {
    headline,
    explanation,
    debts: [],
    credits: [],
    totalDebt: 0,
    totalCredit: 0,
    netAmount: b.amount,
    debtSectionTitle,
    creditSectionTitle,
    isSimplified: true,
    involvedExpenses: uniqueInvolved,
  };
}

