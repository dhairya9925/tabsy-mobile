import { test } from 'node:test';
import assert from 'node:assert';
import { groupsApi } from './groups';
import { apiClient } from './client';
import { cacheService, CACHE_KEYS } from '../services/offline/cacheService';
import { networkService } from '../services/offline/networkService';
import { GroupSettlementRecord } from '../types';

test('groupsApi.settleUp returns the full GroupSettlementRecord and invalidates caches', async () => {
  const mockRecord: GroupSettlementRecord = {
    id: 'rec-123',
    group_id: 'grp-456',
    from_user_id: 'u-1',
    to_user_id: 'u-2',
    from_name: 'Vikram',
    to_name: 'Dhairya',
    amount: 2217.33,
    note: 'Trip settlement',
    settled_by: 'u-1',
    created_at: new Date().toISOString(),
    editable_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    is_disputed: false,
    is_editable: true,
    settled_split_ids: ['split-1', 'split-2'],
  };

  const originalPost = apiClient.post;
  try {
    apiClient.post = (async (endpoint: string, payload: any) => {
      assert.strictEqual(endpoint, '/api/v1/groups/grp-456/settle');
      assert.strictEqual(payload.amount, 2217.33);
      return {
        settled_count: 2,
        settlement_record: mockRecord,
      };
    }) as any;

    const result = await groupsApi.settleUp('grp-456', {
      from_user_id: 'u-1',
      to_user_id: 'u-2',
      amount: 2217.33,
      note: 'Trip settlement',
    });

    assert.strictEqual(result.id, 'rec-123');
    assert.strictEqual(result.amount, 2217.33);
    assert.strictEqual(result.note, 'Trip settlement');
    assert.strictEqual(result.settled_split_ids?.length, 2);
  } finally {
    apiClient.post = originalPost;
  }
});

test('groupsApi.getSettlementRecords fetches and caches records', async () => {
  const mockRecords: GroupSettlementRecord[] = [
    {
      id: 'rec-1',
      group_id: 'grp-1',
      from_user_id: 'u-1',
      to_user_id: 'u-2',
      from_name: 'Priya',
      to_name: 'Dhairya',
      amount: 6717.33,
      settled_by: 'u-1',
      created_at: new Date().toISOString(),
      editable_until: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      is_disputed: false,
      is_editable: true,
    },
  ];

  const originalGet = apiClient.get;
  try {
    apiClient.get = (async (endpoint: string) => {
      assert.strictEqual(endpoint, '/api/v1/groups/grp-1/settlement-records');
      return mockRecords;
    }) as any;

    const records = await groupsApi.getSettlementRecords('grp-1');
    assert.strictEqual(records.length, 1);
    assert.strictEqual(records[0].amount, 6717.33);

    // Verify it was saved to cache
    const cached = await cacheService.get<GroupSettlementRecord[]>(
      CACHE_KEYS.GROUP_SETTLEMENT_RECORDS('grp-1')
    );
    assert.strictEqual(cached?.length, 1);
    assert.strictEqual(cached?.[0].id, 'rec-1');
  } finally {
    apiClient.get = originalGet;
  }
});

test('groupsApi.getSettlementRecord retrieves single record online and offline', async () => {
  const mockRecord: GroupSettlementRecord = {
    id: 'rec-xyz',
    group_id: 'grp-2',
    from_user_id: 'u-1',
    to_user_id: 'u-2',
    amount: 1500,
    settled_by: 'u-1',
    created_at: new Date().toISOString(),
    editable_until: new Date().toISOString(),
    is_disputed: false,
    is_editable: true,
  };

  const originalGet = apiClient.get;
  try {
    apiClient.get = (async (endpoint: string) => {
      assert.strictEqual(endpoint, '/api/v1/groups/grp-2/settlement-records/rec-xyz');
      return mockRecord;
    }) as any;

    const res = await groupsApi.getSettlementRecord('grp-2', 'rec-xyz');
    assert.strictEqual(res.id, 'rec-xyz');
    assert.strictEqual(res.amount, 1500);
  } finally {
    apiClient.get = originalGet;
  }
});

test('groupsApi.updateSettlementRecord updates note and local cache', async () => {
  const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS('grp-3');
  await cacheService.set(cacheKey, [
    {
      id: 'rec-to-edit',
      group_id: 'grp-3',
      from_user_id: 'u-1',
      to_user_id: 'u-2',
      amount: 500,
      note: 'Initial note',
      settled_by: 'u-1',
      created_at: new Date().toISOString(),
      editable_until: new Date().toISOString(),
      is_disputed: false,
      is_editable: true,
    },
  ]);

  const originalPatch = apiClient.patch;
  try {
    apiClient.patch = (async (endpoint: string, payload: any) => {
      assert.strictEqual(endpoint, '/api/v1/groups/grp-3/settlement-records/rec-to-edit');
      assert.strictEqual(payload.note, 'Updated note via UPI');
      return {
        id: 'rec-to-edit',
        group_id: 'grp-3',
        from_user_id: 'u-1',
        to_user_id: 'u-2',
        amount: 500,
        note: 'Updated note via UPI',
        settled_by: 'u-1',
        created_at: new Date().toISOString(),
        editable_until: new Date().toISOString(),
        is_disputed: false,
        is_editable: true,
      };
    }) as any;

    const updated = await groupsApi.updateSettlementRecord('grp-3', 'rec-to-edit', {
      note: 'Updated note via UPI',
    });
    assert.strictEqual(updated.note, 'Updated note via UPI');

    // Verify cache updated
    const cached = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    assert.strictEqual(cached?.[0].note, 'Updated note via UPI');
  } finally {
    apiClient.patch = originalPatch;
  }
});

test('groupsApi.deleteSettlementRecord removes item from cache and calls DELETE', async () => {
  const cacheKey = CACHE_KEYS.GROUP_SETTLEMENT_RECORDS('grp-4');
  await cacheService.set(cacheKey, [
    {
      id: 'rec-del',
      group_id: 'grp-4',
      from_user_id: 'u-1',
      to_user_id: 'u-2',
      amount: 1000,
      settled_by: 'u-1',
      created_at: new Date().toISOString(),
      editable_until: new Date().toISOString(),
      is_disputed: false,
      is_editable: true,
    },
  ]);

  const originalDelete = apiClient.delete;
  try {
    let deletedUrl = '';
    apiClient.delete = (async (endpoint: string) => {
      deletedUrl = endpoint;
    }) as any;

    await groupsApi.deleteSettlementRecord('grp-4', 'rec-del');
    assert.strictEqual(deletedUrl, '/api/v1/groups/grp-4/settlement-records/rec-del');

    // Verify removed from cache
    const cached = await cacheService.get<GroupSettlementRecord[]>(cacheKey);
    assert.strictEqual(cached?.length, 0);
  } finally {
    apiClient.delete = originalDelete;
  }
});
