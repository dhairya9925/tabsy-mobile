export interface ParsedDeepLink {
  route: string;
  params: Record<string, string>;
}

/**
 * Parses Tabsy deep links into route targets and parameters.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;

  // Normalize: remove scheme and leading slashes
  const clean = url
    .replace(/^tabsy:\/\//i, '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '');

  const parts = clean.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const [segment1, segment2, segment3, segment4, segment5] = parts;

  // 1. join/:groupId
  if (segment1 === 'join' && segment2) {
    return {
      route: 'JoinGroupModal',
      params: { groupId: segment2 },
    };
  }

  // 2. groups/:groupId/settlements/:month/:year
  if (segment1 === 'groups' && segment2 && segment3 === 'settlements' && segment4 && segment5) {
    return {
      route: 'MonthlySettlementDetail',
      params: {
        groupId: segment2,
        month: segment4,
        year: segment5,
      },
    };
  }

  // 3. groups/:groupId
  if (segment1 === 'groups' && segment2) {
    return {
      route: 'GroupDetail',
      params: { groupId: segment2 },
    };
  }

  // 4. friends/:friendId
  if (segment1 === 'friends' && segment2) {
    return {
      route: 'FriendDetail',
      params: { friendId: segment2 },
    };
  }

  // 5. add-expense
  if (segment1 === 'add-expense') {
    return {
      route: 'AddExpenseModal',
      params: {},
    };
  }

  // 6. profile
  if (segment1 === 'profile') {
    return {
      route: 'Profile',
      params: {},
    };
  }

  // 7. settings
  if (segment1 === 'settings') {
    return {
      route: 'Settings',
      params: {},
    };
  }

  // 8. categories
  if (segment1 === 'categories') {
    return {
      route: 'CategoryManager',
      params: {},
    };
  }

  return null;
}
