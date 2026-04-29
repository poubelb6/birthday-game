import { Birthday } from '../types';

export function hasSharedProfileDuplicate(friends: Birthday[], profileId: string): boolean {
  const normalizedId = profileId.trim();
  if (!normalizedId) return false;

  return friends.some(friend => friend.userId === normalizedId);
}
