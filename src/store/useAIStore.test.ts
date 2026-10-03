import test from 'node:test';
import assert from 'node:assert';
import { useAIStore } from './useAIStore';
import { aiApi, AIParseResponse } from '../api/ai';
import { expensesApi } from '../api/expenses';
import { groupsApi } from '../api/groups';
import { friendsApi } from '../api/friends';
import { offlineQueue } from '../utils/offlineQueue';

test('useAIStore should initialize with greeting message and idle state', () => {
  const state = useAIStore.getState();
  assert.strictEqual(state.messages.length, 1);
  assert.strictEqual(state.messages[0].id, 'greeting');
  assert.strictEqual(state.messages[0].role, 'assistant');
  assert.strictEqual(state.isLoading, false);
  assert.strictEqual(state.isConfirming, false);
  assert.strictEqual(state.error, null);
  assert.strictEqual(state.pendingConfirmation, null);
});

test('useAIStore sendMessage should handle successful parse and pending confirmation', async () => {
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

test('useAIStore confirmExpense creates personal expense successfully', async () => {
  const originalCreate = expensesApi.createPersonalExpense;
  let payloadCalled: any = null;
  expensesApi.createPersonalExpense = async (payload) => {
    payloadCalled = payload;
    return { id: 'exp-123', ...payload, user_id: 'u-1', created_at: '' } as any;
  };

  useAIStore.setState({
    pendingConfirmation: {
      status: 'confirmed',
      confidence: 1,
      expense_type: 'personal',
      amount: 250,
      category: 'food',
      note: 'Lunch',
      expense_date: '2026-10-02',
    },
  });

  let callbackCalled = false;
  try {
    const success = await useAIStore.getState().confirmExpense(
      {
        status: 'confirmed',
        confidence: 1,
        expense_type: 'personal',
        amount: 250,
        category: 'food',
        note: 'Lunch',
        expense_date: '2026-10-02',
      },
      () => {
        callbackCalled = true;
      }
    );

    assert.strictEqual(success, true);
    assert.strictEqual(callbackCalled, true);
    assert.deepStrictEqual(payloadCalled, {
      amount: 250,
      category: 'food',
      note: 'Lunch',
      expense_date: '2026-10-02',
    });

    const state = useAIStore.getState();
    assert.strictEqual(state.pendingConfirmation, null);
    assert.strictEqual(state.isConfirming, false);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.match(lastMsg.content, /Recorded personal expense of ₹250.00/);
  } finally {
    expensesApi.createPersonalExpense = originalCreate;
  }
});

test('useAIStore confirmExpense creates group expense with equal splits', async () => {
  const originalGetMembers = groupsApi.getGroupMembers;
  const originalCreateGroupExpense = groupsApi.createGroupExpense;

  let groupPayloadCalled: any = null;
  groupsApi.getGroupMembers = async () => [
    { id: 'm1', user_id: 'u1', group_id: 'g-123', role: 'admin', joined_at: '' } as any,
    { id: 'm2', user_id: 'u2', group_id: 'g-123', role: 'member', joined_at: '' } as any,
  ];

  groupsApi.createGroupExpense = async (groupId, payload) => {
    groupPayloadCalled = { groupId, payload };
    return { id: 'gexp-1', ...payload } as any;
  };

  try {
    const success = await useAIStore.getState().confirmExpense({
      status: 'confirmed',
      confidence: 1,
      expense_type: 'group',
      group_id: 'g-123',
      group_name: 'Roommates',
      amount: 300,
      category: 'groceries',
      note: 'Milk & Eggs',
      expense_date: '2026-10-02',
    });

    assert.strictEqual(success, true);
    assert.strictEqual(groupPayloadCalled.groupId, 'g-123');
    assert.strictEqual(groupPayloadCalled.payload.amount, 300);
    assert.strictEqual(groupPayloadCalled.payload.splits.length, 2);
    assert.strictEqual(groupPayloadCalled.payload.splits[0].amount, 150);
    assert.strictEqual(groupPayloadCalled.payload.splits[1].amount, 150);

    const state = useAIStore.getState();
    assert.strictEqual(state.pendingConfirmation, null);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.match(lastMsg.content, /Recorded group expense of ₹300.00.*Roommates/);
  } finally {
    groupsApi.getGroupMembers = originalGetMembers;
    groupsApi.createGroupExpense = originalCreateGroupExpense;
  }
});

test('useAIStore confirmExpense creates friend expense with split type', async () => {
  const originalCreateFriendExpense = friendsApi.createFriendExpense;
  let friendPayloadCalled: any = null;

  friendsApi.createFriendExpense = async (friendId, payload) => {
    friendPayloadCalled = { friendId, payload };
    return { id: 'fexp-1', ...payload } as any;
  };

  try {
    const success = await useAIStore.getState().confirmExpense({
      status: 'confirmed',
      confidence: 1,
      expense_type: 'friend',
      friend_id: 'friend-456',
      friend_name: 'Rahul',
      amount: 600,
      category: 'food',
      note: 'Dinner',
      split_type: 'equal',
      expense_date: '2026-10-02',
    });

    assert.strictEqual(success, true);
    assert.strictEqual(friendPayloadCalled.friendId, 'friend-456');
    assert.strictEqual(friendPayloadCalled.payload.amount, 600);
    assert.strictEqual(friendPayloadCalled.payload.split_type, 'equal');

    const state = useAIStore.getState();
    assert.strictEqual(state.pendingConfirmation, null);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.match(lastMsg.content, /Recorded friend expense of ₹600.00.*Rahul/);
  } finally {
    friendsApi.createFriendExpense = originalCreateFriendExpense;
  }
});

test('useAIStore confirmExpense handles failure and allows retry without dropping pending card', async () => {
  const originalCreate = expensesApi.createPersonalExpense;
  expensesApi.createPersonalExpense = async () => {
    throw new Error('Database transaction timeout');
  };

  useAIStore.setState({
    pendingConfirmation: {
      status: 'confirmed',
      confidence: 1,
      expense_type: 'personal',
      amount: 500,
    },
  });

  try {
    const success = await useAIStore.getState().confirmExpense({
      status: 'confirmed',
      confidence: 1,
      expense_type: 'personal',
      amount: 500,
      category: 'shopping',
    });

    assert.strictEqual(success, false);
    const state = useAIStore.getState();
    assert.strictEqual(state.isConfirming, false);
    assert.notStrictEqual(state.error, null);
    // Crucial requirement: pendingConfirmation must NOT be dropped on error so user can retry!
    assert.notStrictEqual(state.pendingConfirmation, null);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.match(lastMsg.content, /Database transaction timeout/);
  } finally {
    expensesApi.createPersonalExpense = originalCreate;
  }
});

test('useAIStore multi-turn flow: clarification -> selectOption -> confirmed expense', async () => {
  useAIStore.getState().clearChat();

  const originalParse = aiApi.parseExpense;
  let callCount = 0;
  const historyPassed: any[] = [];

  aiApi.parseExpense = async (params) => {
    callCount++;
    historyPassed.push(params.conversationHistory);

    if (callCount === 1) {
      // Turn 1: User says "Add 500 to group", AI asks which group
      return {
        status: 'needs_clarification',
        confidence: 0.5,
        clarification_question: 'Which group should I add this to?',
        clarification_options: ['Roommates', 'Goa Trip'],
        ai_understanding: 'You want to add ₹500 to a group expense.',
      };
    } else {
      // Turn 2: User selected "Roommates", AI confirms group expense
      return {
        status: 'confirmed',
        confidence: 0.95,
        expense_type: 'group',
        group_id: 'g-roommates',
        group_name: 'Roommates',
        amount: 500,
        category: 'other',
        expense_date: '2026-10-02',
      };
    }
  };

  try {
    // 1. Initial user request
    await useAIStore.getState().sendMessage({ text: 'Add 500 to group' });

    let state = useAIStore.getState();
    assert.strictEqual(state.messages.length, 3); // greeting, userMsg, clarification
    const clarMsg = state.messages[2];
    assert.strictEqual(clarMsg.isClarification, true);
    assert.strictEqual(clarMsg.clarificationQuestion, 'Which group should I add this to?');
    assert.strictEqual(clarMsg.aiUnderstanding, 'You want to add ₹500 to a group expense.');

    // 2. User taps an option chip
    await useAIStore.getState().selectOption('Roommates');

    state = useAIStore.getState();
    assert.strictEqual(callCount, 2);
    // Verified: history in 2nd call correctly contains the prior turns (initial prompt + AI clarification)
    assert.strictEqual(historyPassed[1].length, 2);
    assert.strictEqual(historyPassed[1][0].role, 'user');
    assert.strictEqual(historyPassed[1][0].content, 'Add 500 to group');
    assert.strictEqual(historyPassed[1][1].role, 'assistant');
    assert.strictEqual(historyPassed[1][1].content, 'Which group should I add this to?');

    // And now state has pendingConfirmation set to confirmed group expense
    assert.notStrictEqual(state.pendingConfirmation, null);
    assert.strictEqual(state.pendingConfirmation?.group_name, 'Roommates');
    assert.strictEqual(state.pendingConfirmation?.amount, 500);
  } finally {
    aiApi.parseExpense = originalParse;
  }
});

test('useAIStore user cancels mid-clarification cleanly', () => {
  useAIStore.getState().clearChat();

  useAIStore.setState({
    messages: [
      { id: 'greeting', role: 'assistant', content: 'Hi', timestamp: 0 },
      { id: 'u1', role: 'user', content: 'Spent 500', timestamp: 1 },
      {
        id: 'a1',
        role: 'assistant',
        content: 'What was this expense for?',
        timestamp: 2,
        isClarification: true,
      },
    ],
    pendingConfirmation: null,
  });

  useAIStore.getState().cancelConfirmation();

  const state = useAIStore.getState();
  assert.strictEqual(state.pendingConfirmation, null);
  const lastMsg = state.messages[state.messages.length - 1];
  assert.match(lastMsg.content, /cancelled/i);
});

test('useAIStore confirmExpense queues to offlineQueue when network error occurs', async () => {
  const originalCreate = expensesApi.createPersonalExpense;
  expensesApi.createPersonalExpense = async () => {
    const netErr: any = new Error('Network Error');
    netErr.code = 'ERR_NETWORK';
    throw netErr;
  };

  await offlineQueue.clearQueue();

  useAIStore.setState({
    pendingConfirmation: {
      status: 'confirmed',
      confidence: 1,
      expense_type: 'personal',
      amount: 450,
      category: 'Food',
    },
  });

  try {
    const success = await useAIStore.getState().confirmExpense({
      status: 'confirmed',
      confidence: 1,
      expense_type: 'personal',
      amount: 450,
      category: 'Food',
    });

    assert.strictEqual(success, true);
    assert.strictEqual(await offlineQueue.getCount(), 1);
    const queued = await offlineQueue.getQueue();
    assert.strictEqual(queued[0].amount, 450);
    assert.strictEqual(queued[0].category, 'Food');

    const state = useAIStore.getState();
    assert.strictEqual(state.isConfirming, false);
    assert.strictEqual(state.pendingConfirmation, null);
    const lastMsg = state.messages[state.messages.length - 1];
    assert.match(lastMsg.content, /safely queued/);
  } finally {
    expensesApi.createPersonalExpense = originalCreate;
    await offlineQueue.clearQueue();
  }
});

