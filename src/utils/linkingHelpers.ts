export interface ParsedDeepLink {
  route: string;
  params: Record<string, string>;
}

/**
 * Parses splittrack deep links into route targets and parameters.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;

  // Normalize: remove scheme and leading slashes
  const clean = url
    .replace(/^(tabsy|splittrack):\/\//i, '')
    .replace(/^https?:\/\/[^/]+\//i, '')
    .replace(/^\/+/, '');

  // Separate query parameters
  const [pathPart, queryPart] = clean.split('?');
  const queryParams: Record<string, string> = {};
  if (queryPart) {
    queryPart.split('&').forEach((pair) => {
      const [k, v] = pair.split('=');
      if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  }

  const parts = pathPart.split('/').filter(Boolean);
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

  // 6. quick-add
  if (segment1 === 'quick-add') {
    return {
      route: 'QuickAddModal',
      params: queryParams,
    };
  }

  // 7. ai-agent
  if (segment1 === 'ai-agent') {
    return {
      route: 'AIAgent',
      params: {},
    };
  }

  // 8. profile
  if (segment1 === 'profile') {
    return {
      route: 'Profile',
      params: {},
    };
  }

  // 9. settings
  if (segment1 === 'settings') {
    return {
      route: 'Settings',
      params: {},
    };
  }

  // 10. categories
  if (segment1 === 'categories') {
    return {
      route: 'CategoryManager',
      params: {},
    };
  }

  return null;
}

