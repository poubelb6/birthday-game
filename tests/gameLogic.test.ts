import { Birthday, UserProfile } from '../src/types';
import { checkUnlockedCards } from '../src/utils/gameLogic';
import { assert, assertEqual, runTest } from './helpers';

function createUser(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: 'user-1',
    name: 'Test User',
    birthDate: '1990-01-01',
    socials: {},
    wishlist: [],
    zodiac: 'Capricorne',
    xp: 0,
    level: 1,
    collectedCards: [],
    scansCount: 0,
    ...overrides,
  };
}

function createBirthday(overrides: Partial<Birthday> = {}): Birthday {
  return {
    id: 'friend-1',
    name: 'Friend',
    birthDate: '1990-01-01',
    zodiac: 'Capricorne',
    addedAt: '2026-04-28T10:00:00.000Z',
    ...overrides,
  };
}

runTest('checkUnlockedCards unlocks early progression rewards', () => {
  const birthdays: Birthday[] = [
    createBirthday({ id: 'f1', photoUrl: 'https://example.com/photo.jpg' }),
    createBirthday({ id: 'f2', birthDate: '1990-02-02', zodiac: 'Verseau' }),
    createBirthday({ id: 'f3', birthDate: '1990-03-03', zodiac: 'BÃ©lier' as Birthday['zodiac'] }),
    createBirthday({ id: 'f4', birthDate: '1990-04-04', zodiac: 'BÃ©lier' as Birthday['zodiac'] }),
    createBirthday({ id: 'f5', birthDate: '1990-05-05', zodiac: 'BÃ©lier' as Birthday['zodiac'] }),
  ];

  const user = createUser({
    socials: { instagram: '@test' },
    wishlist: ['Livre'],
    scansCount: 1,
  });

  const unlocked = checkUnlockedCards(birthdays, user);

  assert(unlocked.includes('c1'), 'Expected c1 to unlock after the first friend');
  assert(unlocked.includes('c3'), 'Expected c3 to unlock when a friend has a photo');
  assert(unlocked.includes('c4'), 'Expected c4 to unlock when socials are filled');
  assert(unlocked.includes('c5'), 'Expected c5 to unlock when wishlist exists');
  assert(unlocked.includes('c6'), 'Expected c6 to unlock after the first scan');
  assert(unlocked.includes('c7'), 'Expected c7 to unlock at two friends');
  assert(unlocked.includes('c8'), 'Expected c8 to unlock at five friends');
});

runTest('checkUnlockedCards preserves externally granted cards', () => {
  const user = createUser({ collectedCards: ['c2'] });
  const unlocked = checkUnlockedCards([], user);

  assertEqual(unlocked.includes('c2'), true, 'Expected externally granted calendar card to remain unlocked');
});
