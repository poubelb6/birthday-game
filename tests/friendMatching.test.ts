import { Birthday } from '../src/types';
import { hasSharedProfileDuplicate } from '../src/utils/friendMatching';
import { assertEqual, runTest } from './helpers';

runTest('shared profile duplicate is detected from userId', () => {
  const friends: Birthday[] = [
    { id: 'doc-1', userId: 'uid-123', name: 'Amine', birthDate: '1995-04-18', zodiac: 'BÃ©lier' as Birthday['zodiac'], addedAt: '2026-04-28T10:00:00.000Z' },
  ];

  assertEqual(hasSharedProfileDuplicate(friends, 'uid-123'), true, 'Expected duplicate shared profile to be detected');
});

runTest('same name without matching shared profile id is not treated as duplicate', () => {
  const friends: Birthday[] = [
    { id: 'doc-1', userId: 'uid-123', name: 'Sarah', birthDate: '1995-04-18', zodiac: 'BÃ©lier' as Birthday['zodiac'], addedAt: '2026-04-28T10:00:00.000Z' },
    { id: 'doc-2', name: 'Sarah', birthDate: '1998-05-10', zodiac: 'Taureau', addedAt: '2026-04-28T10:00:00.000Z' },
  ];

  assertEqual(hasSharedProfileDuplicate(friends, 'uid-999'), false, 'Expected name match alone to stay allowed');
});

runTest('profile id matching trims surrounding spaces', () => {
  const friends: Birthday[] = [
    { id: 'doc-1', userId: 'uid-abc', name: 'Lina', birthDate: '1997-09-12', zodiac: 'Vierge', addedAt: '2026-04-28T10:00:00.000Z' },
  ];

  assertEqual(hasSharedProfileDuplicate(friends, ' uid-abc '), true, 'Expected profile id trimming to preserve duplicate protection');
});
