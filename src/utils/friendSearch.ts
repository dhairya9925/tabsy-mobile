import { FriendRecord, Group } from '../types';

/**
 * Filter friends by search query across display_name and email.
 */
export function filterFriends(friends: FriendRecord[], query: string): FriendRecord[] {
  if (!query || !query.trim()) return friends;
  const q = query.toLowerCase().trim();
  return friends.filter((f) => {
    const name = (f.profile?.display_name || '').toLowerCase();
    const email = (f.profile?.email || '').toLowerCase();
    return name.includes(q) || email.includes(q);
  });
}

/**
 * Filter groups by search query across group name and description.
 */
export function filterGroups(groups: Group[], query: string): Group[] {
  if (!query || !query.trim()) return groups;
  const q = query.toLowerCase().trim();
  return groups.filter((g) => {
    const name = (g.name || '').toLowerCase();
    const desc = (g.description || '').toLowerCase();
    return name.includes(q) || desc.includes(q);
  });
}
