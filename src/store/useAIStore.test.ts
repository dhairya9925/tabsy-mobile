import test from 'node:test';
import assert from 'node:assert';
import { useAIStore } from './useAIStore';
import { aiApi, AIParseResponse } from '../api/ai';

test('useAIStore should initialize with greeting message and idle state', () => {
  const state = useAIStore.getState();
  assert.strictEqual(state.messages.length, 1);
  assert.strictEqual(state.messages[0].id, 'greeting');
  assert.strictEqual(state.messages[0].role, 'assistant');
  assert.strictEqual(state.isLoading, false);
  assert.strictEqual(state.error, null);
  assert.strictEqual(state.pendingConfirmation, null);
});

test('useAIStore sendMessage should handle successful parse and pending confirmation', async () => {
  // Mock aiApi.parseExpense
  const originalParseExpense = aiApi.parseExpense;
  const mockResponse: AIParseResponse = {
    status: 'confirmed',
    confidence: 0.95,
    expense_type: 'personal',
    amount: 250,
    category: 'Food & Dining',
    note: 'Lunch at Subway',
    expense_date: '2026-10-02',
  };

  aiApi.parseExpense = async () => mockResponse;

  try {
    await useAIStore.getState().sendMessage({ text: 'Spent 250 on lunch' });

    const state = useAIStore.getState();
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.error, null);
    assert.strictEqual(state.messages.length, 3); // greeting, user message, assistant response
    assert.strictEqual(state.messages[1].role, 'user');
    assert.strictEqual(state.messages[1].content, 'Spent 250 on lunch');
    assert.strictEqual(state.messages[2].role, 'assistant');
    assert.deepStrictEqual(state.pendingConfirmation, mockResponse);
  } finally {
    aiApi.parseExpense = originalParseExpense;
  }
});

test('useAIStore sendMessage should handle clarification needed', async () => {
  const originalParseExpense = aiApi.parseExpense;
  const mockResponse: AIParseResponse = {
    status: 'needs_clarification',
    confidence: 0.5,
    clarification_question: 'Which group should I add this to?',
    clarification_options: ['Roommates', 'Goa Trip'],
    ai_understanding: 'You want to add ₹500 to a group expense.',
  };

  aiApi.parseExpense = async () => mockResponse;

  try {
    await useAIStore.getState().sendMessage({ text: 'Add 500 to group' });

    const state = useAIStore.getState();
    assert.strictEqual(state.isLoading, false);
    assert.strictEqual(state.pendingConfirmation, null);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.strictEqual(lastMsg.role, 'assistant');
    assert.strictEqual(lastMsg.isClarification, true);
    assert.deepStrictEqual(lastMsg.clarificationOptions, ['Roommates', 'Goa Trip']);
  } finally {
    aiApi.parseExpense = originalParseExpense;
  }
});

test('useAIStore cancelConfirmation should dismiss pending confirmation', () => {
  useAIStore.setState({
    pendingConfirmation: {
      status: 'confirmed',
      confidence: 1,
      amount: 100,
    },
  });

  useAIStore.getState().cancelConfirmation();

  const state = useAIStore.getState();
  assert.strictEqual(state.pendingConfirmation, null);
  const lastMsg = state.messages[state.messages.length - 1];
  assert.strictEqual(lastMsg.role, 'assistant');
  assert.match(lastMsg.content, /cancelled/i);
});

test('useAIStore clearChat should reset conversation to initial greeting', () => {
  useAIStore.getState().clearChat();

  const state = useAIStore.getState();
  assert.strictEqual(state.messages.length, 1);
  assert.strictEqual(state.messages[0].id, 'greeting');
  assert.strictEqual(state.isLoading, false);
  assert.strictEqual(state.error, null);
  assert.strictEqual(state.pendingConfirmation, null);
});
